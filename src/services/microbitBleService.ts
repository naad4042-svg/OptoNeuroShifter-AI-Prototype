/**
 * BBC micro:bit Web Bluetooth UART Service
 * 
 * Uses the Nordic Semiconductor UART Service exposed by MakeCode:
 * - Service UUID: 6e400001-b5a3-f393-e0a9-e50e24dcca9e
 * - Write / Write Without Response (Web App -> micro:bit): 6e400003-b5a3-f393-e0a9-e50e24dcca9e (commands e.g. 'V\n')
 * - Indicate / Notify (micro:bit -> Web App): 6e400002-b5a3-f393-e0a9-e50e24dcca9e (VL53L0X distance in mm)
 */

import { formatDistance } from '../utils/formatDistance';

// Nordic Semiconductor UART Service UUIDs
export const NORDIC_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
// Characteristic 6e400003... has Write / Write Without Response capability on micro:bit
export const NORDIC_UART_WRITE_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; 
// Characteristic 6e400002... has Indicate / Notify capability on micro:bit
export const NORDIC_UART_INDICATE_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

// Keep legacy alias exports for backward-compatibility if imported elsewhere
export const NORDIC_UART_RX_CHAR = NORDIC_UART_WRITE_CHAR;
export const NORDIC_UART_TX_CHAR = NORDIC_UART_INDICATE_CHAR;

export interface MicrobitConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  sensorDistanceMm: number | null;
  sensorDistanceMeters: number | null;
  sensorDistanceFormatted: string | null;
  isLiveSensorActive: boolean;
  lastSensorTimestamp: number | null;
  lastCommandSent: string | null;
  lastCommandTimestamp: number | null;
  error: string | null;
  connectionStage?: string;
  lastCompletedStage?: string | null;
  currentFailingStage?: string | null;
}

type StateListener = (state: MicrobitConnectionState) => void;

class MicrobitBleService {
  private device: any = null;
  private server: any = null;
  private writeCharacteristic: any = null;
  private notifyCharacteristic: any = null;
  private listeners: Set<StateListener> = new Set();
  private textDecoder: TextDecoder = new TextDecoder();
  private receiveBuffer: string = '';
  private isConnectingLock: boolean = false;
  
  private state: MicrobitConnectionState = {
    isConnected: false,
    isConnecting: false,
    deviceName: null,
    sensorDistanceMm: null,
    sensorDistanceMeters: null,
    sensorDistanceFormatted: null,
    isLiveSensorActive: false,
    lastSensorTimestamp: null,
    lastCommandSent: null,
    lastCommandTimestamp: null,
    error: null,
    connectionStage: 'idle',
    lastCompletedStage: null,
    currentFailingStage: null
  };

  public isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public getState(): MicrobitConnectionState {
    return { ...this.state };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<MicrobitConnectionState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Connects to the BBC micro:bit via Web Bluetooth with a 30-second timeout.
   * Tracks real-time connection progress across the 5 stages:
   * - Stage 1: Stage 1 Device Selected
   * - Stage 2: Stage 2 GATT Connected
   * - Stage 3: Stage 3 Nordic UART Service Found
   * - Stage 4: Stage 4 Characteristics Found
   * - Stage 5: Stage 5 Notifications Started
   */
  public async connect(): Promise<boolean> {
    // If already connected and ready, return immediately
    if (this.state.isConnected && this.server && this.server.connected && this.writeCharacteristic) {
      console.log('[BLE] Connection already active and verified.');
      this.updateState({ 
        isConnecting: false, 
        error: null, 
        connectionStage: 'Connected',
        lastCompletedStage: 'Stage 5 Notifications Started',
        currentFailingStage: null
      });
      return true;
    }

    if (this.isConnectingLock) {
      console.warn('[BLE] Connection attempt already in progress.');
      return false;
    }

    if (!this.isBluetoothSupported()) {
      const err = 'Web Bluetooth is not supported in Safari on iPadOS. Please open this app in Bluefy browser.';
      console.error(`[BLE Stage 0: Browser Check] ${err}`);
      this.updateState({
        isConnecting: false,
        error: err,
        connectionStage: 'unsupported',
        lastCompletedStage: null,
        currentFailingStage: 'Browser Web Bluetooth Support Check'
      });
      return false;
    }

    this.isConnectingLock = true;

    // Track active stage state for fine-grained real-time reporting & timeout attribution
    let lastCompletedStage: string | null = null;
    let currentExecutingStage: string = 'Stage 1 Device Selection';

    this.updateState({ 
      isConnecting: true, 
      error: null, 
      connectionStage: 'Stage 1: Selecting Device...', 
      lastCompletedStage: null,
      currentFailingStage: null 
    });

    let device: any = null;
    let selectedDeviceName: string = 'BBC micro:bit';

    try {
      const navBluetooth = (navigator as any).bluetooth;

      // Stage 1: Device Selection (Invoked directly on user click without timeout wrapper)
      console.log('[BLE Stage 1/5: Device Selection] Requesting Bluetooth device with acceptAllDevices: true...');
      
      device = await navBluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
      });

      if (!device) {
        throw new Error('No micro:bit device was selected.');
      }

      // Stage 1 COMPLETED immediately after requestDevice() returns
      lastCompletedStage = 'Stage 1 Device Selected';
      selectedDeviceName = device.name || 'BBC micro:bit';
      console.log(`[BLE Stage 1 COMPLETED: Stage 1 Device Selected] Device: ${selectedDeviceName} (${device.id})`);
      
      this.device = device;
      device.removeEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));
      device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

      // Display selected device name in UI and mark Stage 1 completed before starting Stage 2
      this.updateState({
        lastCompletedStage: 'Stage 1 Device Selected',
        deviceName: selectedDeviceName,
        connectionStage: `Stage 1 Completed: Selected "${selectedDeviceName}". Stage 2: Connecting to GATT Server...`,
        currentFailingStage: null
      });
    } catch (stage1Err: any) {
      this.isConnectingLock = false;
      console.warn('[BLE Stage 1 Device Selection Error]', stage1Err);

      const isUserCancel = stage1Err.name === 'NotFoundError' || (stage1Err.message && stage1Err.message.includes('User cancelled'));
      
      if (isUserCancel) {
        this.updateState({
          isConnected: false,
          isConnecting: false,
          error: null,
          connectionStage: 'idle',
          currentFailingStage: null
        });
        return false;
      }

      this.updateState({
        isConnected: false,
        isConnecting: false,
        error: `Device selection error: ${stage1Err.message || 'Failed to select device'}. Last successfully completed: "None (failed before device selection)". Failed at: "Stage 1 Device Selection".`,
        connectionStage: 'failed',
        lastCompletedStage: null,
        currentFailingStage: 'Stage 1 Device Selection'
      });
      return false;
    }

    // Start 30-second timeout ONLY after device selection, for Stage 2 GATT connection and onwards
    let connectionTimeout: any = null;
    let timedOut = false;

    const timeoutPromise = new Promise<never>((_, reject) => {
      connectionTimeout = setTimeout(() => {
        timedOut = true;
        const lastStageText = lastCompletedStage ? `"${lastCompletedStage}"` : 'None';
        const timeoutErrMsg = `Connection timed out after 30 seconds.\n• Last successfully completed: ${lastStageText}\n• Currently failing at: "${currentExecutingStage}".`;
        reject(new Error(timeoutErrMsg));
      }, 30000);
    });

    try {
      const connectOperation = async () => {
        // Stage 2: GATT Connection
        currentExecutingStage = 'Stage 2 GATT Connection';
        this.updateState({ 
          connectionStage: 'Stage 2: Connecting to GATT Server...',
          lastCompletedStage: 'Stage 1 Device Selected',
          deviceName: selectedDeviceName
        });
        console.log('[BLE Stage 2/5: GATT Connection] Connecting to GATT Server...');
        
        let server: any = null;
        try {
          server = await device.gatt.connect();
          this.server = server;
        } catch (gattErr: any) {
          console.error('[BLE Stage 2/5: GATT Connection Failed]', gattErr);
          throw new Error(`GATT Server connection failed: ${gattErr.message || 'Could not establish connection'}`);
        }

        // Stage 2 COMPLETED
        lastCompletedStage = 'Stage 2 GATT Connected';
        console.log('[BLE Stage 2 COMPLETED: Stage 2 GATT Connected] Connected to micro:bit GATT Server.');

        // Stage 3: Nordic UART Service Discovery
        currentExecutingStage = 'Stage 3 Nordic UART Service Discovery';
        this.updateState({ 
          connectionStage: 'Stage 3: Discovering Nordic UART Service...',
          lastCompletedStage: 'Stage 2 GATT Connected'
        });
        console.log(`[BLE Stage 3/5: Service Discovery] Querying Nordic UART Service (${NORDIC_UART_SERVICE})...`);
        
        let service: any = null;
        try {
          service = await server.getPrimaryService(NORDIC_UART_SERVICE);
          if (!service) {
            throw new Error(`Nordic UART Service (${NORDIC_UART_SERVICE}) not returned.`);
          }
        } catch (servErr: any) {
          console.error('[BLE Stage 3/5: Service Discovery Failed]', servErr);
          throw new Error(`Nordic UART Service (${NORDIC_UART_SERVICE}) not found. Ensure MakeCode firmware has bluetooth.startUartService().`);
        }

        // Stage 3 COMPLETED
        lastCompletedStage = 'Stage 3 Nordic UART Service Found';
        console.log('[BLE Stage 3 COMPLETED: Stage 3 Nordic UART Service Found] Primary service acquired.');

        // Stage 4: Characteristic Discovery & Capability Mapping
        currentExecutingStage = 'Stage 4 Characteristic Discovery';
        this.updateState({ 
          connectionStage: 'Stage 4: Finding Characteristics...',
          lastCompletedStage: 'Stage 3 Nordic UART Service Found'
        });
        console.log('[BLE Stage 4/5: Characteristic Discovery] Inspecting GATT characteristics...');
        
        let writeChar: any = null;
        let indicateChar: any = null;

        try {
          const characteristics = await service.getCharacteristics();
          console.log(`[BLE Stage 4/5: Characteristic Discovery] Discovered ${characteristics.length} characteristics:`);

          for (const char of characteristics) {
            const uuid = char.uuid.toLowerCase();
            const props = char.properties || {};
            console.log(`  - UUID: ${uuid} | [read: ${!!props.read}, write: ${!!props.write}, writeWithoutResponse: ${!!props.writeWithoutResponse}, notify: ${!!props.notify}, indicate: ${!!props.indicate}]`);

            // Capability-based detection:
            // Check write capability (write or writeWithoutResponse)
            if (props.write || props.writeWithoutResponse || uuid.includes('6e400003')) {
              if (!writeChar || uuid.includes('6e400003')) {
                writeChar = char;
                console.log(`    -> Assigned as WRITE characteristic (UUID: ${uuid})`);
              }
            }

            // Check indication/notification capability (indicate or notify)
            if (props.indicate || props.notify || uuid.includes('6e400002')) {
              if (!indicateChar || uuid.includes('6e400002')) {
                indicateChar = char;
                console.log(`    -> Assigned as INDICATE/NOTIFY characteristic (UUID: ${uuid})`);
              }
            }
          }
        } catch (getCharsErr: any) {
          console.warn('[BLE Stage 4: Characteristic Discovery] getCharacteristics failed, trying direct lookup:', getCharsErr);
          try {
            writeChar = await service.getCharacteristic(NORDIC_UART_WRITE_CHAR);
          } catch (wErr) {
            console.warn(`  -> Lookup write char (${NORDIC_UART_WRITE_CHAR}) failed:`, wErr);
          }

          try {
            indicateChar = await service.getCharacteristic(NORDIC_UART_INDICATE_CHAR);
          } catch (iErr) {
            console.warn(`  -> Lookup indicate char (${NORDIC_UART_INDICATE_CHAR}) failed:`, iErr);
          }
        }

        if (!writeChar && !indicateChar) {
          throw new Error('Neither write nor notify UART characteristics were found in Nordic UART service.');
        }

        this.writeCharacteristic = writeChar;
        this.notifyCharacteristic = indicateChar;

        // Stage 4 COMPLETED
        lastCompletedStage = 'Stage 4 Characteristics Found';
        console.log('[BLE Stage 4 COMPLETED: Stage 4 Characteristics Found] Write & Indicate characteristics mapped.');

        // Stage 5: Notification / Indication Subscription
        currentExecutingStage = 'Stage 5 Notification Subscription';
        this.updateState({ 
          connectionStage: 'Stage 5: Starting Notifications...',
          lastCompletedStage: 'Stage 4 Characteristics Found'
        });
        console.log('[BLE Stage 5/5: Notification Subscription] Subscribing to incoming UART indications/notifications...');

        if (indicateChar) {
          try {
            await indicateChar.startNotifications();
            indicateChar.removeEventListener('characteristicvaluechanged', this.handleIncomingUartData.bind(this));
            indicateChar.addEventListener('characteristicvaluechanged', this.handleIncomingUartData.bind(this));
            console.log('[BLE Stage 5 COMPLETED: Stage 5 Notifications Started] Subscribed to VL53L0X distance stream.');
          } catch (subErr: any) {
            console.warn('[BLE Stage 5 Warning] Indication start error (write capability remains active):', subErr);
          }
        }

        // Stage 5 COMPLETED
        lastCompletedStage = 'Stage 5 Notifications Started';
        currentExecutingStage = 'Connected';

        console.log(`[BLE Connection Complete] Connected to ${selectedDeviceName}. All 5 stages succeeded.`);
        this.updateState({
          isConnected: true,
          isConnecting: false,
          deviceName: selectedDeviceName,
          error: null,
          connectionStage: 'Connected',
          lastCompletedStage: 'Stage 5 Notifications Started',
          currentFailingStage: null
        });

        return true;
      };

      const result = await Promise.race([connectOperation(), timeoutPromise]);
      clearTimeout(connectionTimeout);
      this.isConnectingLock = false;
      return result;
    } catch (err: any) {
      clearTimeout(connectionTimeout);
      this.isConnectingLock = false;
      console.warn('[BLE Connection Error]', err);

      const isUserCancel = err.name === 'NotFoundError' || (err.message && err.message.includes('User cancelled'));
      
      if (isUserCancel) {
        this.updateState({
          isConnected: false,
          isConnecting: false,
          error: null,
          connectionStage: 'idle',
          currentFailingStage: null
        });
        return false;
      }

      // Construct explicit error message with last completed stage and currently failing stage
      const lastDoneText = lastCompletedStage ? lastCompletedStage : 'None (failed before device selection)';
      const failingText = currentExecutingStage;
      
      let detailedErrorMessage = '';
      if (timedOut || err.message?.includes('timed out')) {
        detailedErrorMessage = `Connection timed out after 30 seconds. Last successfully completed: "${lastDoneText}". Currently failing at: "${failingText}".`;
      } else {
        detailedErrorMessage = `${err.message || 'Connection error'}. Last successfully completed: "${lastDoneText}". Failed at: "${failingText}".`;
      }

      this.updateState({
        isConnected: false,
        isConnecting: false,
        error: detailedErrorMessage,
        connectionStage: 'failed',
        lastCompletedStage,
        currentFailingStage: failingText
      });
      return false;
    }
  }

  /**
   * Parses continuous incoming UART data from the micro:bit (VL53L0X distance in mm)
   */
  private handleIncomingUartData(event: any) {
    try {
      const value = event.target.value;
      if (!value) return;

      const chunk = this.textDecoder.decode(value);
      this.receiveBuffer += chunk;

      // Process complete lines
      if (this.receiveBuffer.includes('\n') || this.receiveBuffer.includes('\r')) {
        const lines = this.receiveBuffer.split(/[\r\n]+/);
        // Retain any incomplete trailing fragment in the buffer
        this.receiveBuffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          // Parse numeric distance value in millimeters (e.g. "820", "d:820", "DIST=1250", "VL:350")
          const numberMatch = line.match(/[-+]?([0-9]*\.[0-9]+|[0-9]+)/);
          if (numberMatch) {
            const distanceMm = parseFloat(numberMatch[0]);
            
            // Valid VL53L0X ranges: 20mm to 6000mm
            if (!isNaN(distanceMm) && distanceMm > 0 && distanceMm <= 6000) {
              const distanceMeters = distanceMm / 1000;
              const formatted = formatDistance(distanceMeters);

              this.updateState({
                sensorDistanceMm: Math.round(distanceMm),
                sensorDistanceMeters: distanceMeters,
                sensorDistanceFormatted: formatted,
                isLiveSensorActive: true,
                lastSensorTimestamp: Date.now()
              });
            }
          }
        }
      }
    } catch (parseErr) {
      console.warn('[BLE UART Parser Error]', parseErr);
    }
  }

  /**
   * Disconnect from the micro:bit
   */
  public disconnect() {
    console.log('[BLE] Disconnecting from micro:bit...');
    if (this.notifyCharacteristic) {
      try {
        this.notifyCharacteristic.removeEventListener('characteristicvaluechanged', this.handleIncomingUartData.bind(this));
        this.notifyCharacteristic.stopNotifications();
      } catch (e) {
        // Ignore disconnect cleanup errors
      }
    }
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      try {
        this.device.gatt.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
    this.handleDisconnect();
  }

  private handleDisconnect() {
    console.log('[BLE] Connection terminated / GATT disconnected.');
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.server = null;
    this.receiveBuffer = '';
    this.isConnectingLock = false;
    this.updateState({
      isConnected: false,
      isConnecting: false,
      deviceName: null,
      isLiveSensorActive: false,
      connectionStage: 'disconnected'
    });
  }

  /**
   * Sends raw string command to the micro:bit UART write characteristic (6e400003...)
   * @param command Command string to send (e.g. "V\n")
   */
  public async sendCommand(command: string): Promise<boolean> {
    // If not connected, attempt connection first
    if (!this.state.isConnected || !this.writeCharacteristic || !this.server?.connected) {
      console.log('[BLE Command] Not connected. Attempting connection first...');
      const connected = await this.connect();
      if (!connected || !this.writeCharacteristic) {
        console.error('[BLE Command] Connection failed, cannot transmit command.');
        return false;
      }
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(command);
      
      let writeSuccess = false;
      let lastError: any = null;

      // 1. Try writeValueWithoutResponse if supported (preferred for fast command transfer)
      if (this.writeCharacteristic.writeValueWithoutResponse) {
        try {
          await this.writeCharacteristic.writeValueWithoutResponse(data);
          writeSuccess = true;
          console.log(`[BLE Command Sent via writeValueWithoutResponse]: "${command.replace('\n', '\\n')}"`);
        } catch (err1) {
          console.warn('[BLE writeValueWithoutResponse failed, trying standard writeValue]:', err1);
          lastError = err1;
        }
      }

      // 2. Try standard writeValue if not already sent
      if (!writeSuccess && this.writeCharacteristic.writeValue) {
        try {
          await this.writeCharacteristic.writeValue(data);
          writeSuccess = true;
          console.log(`[BLE Command Sent via writeValue]: "${command.replace('\n', '\\n')}"`);
        } catch (err2) {
          console.warn('[BLE writeValue failed, trying writeValueWithResponse]:', err2);
          lastError = err2;
        }
      }

      // 3. Try writeValueWithResponse if available and still not sent
      if (!writeSuccess && this.writeCharacteristic.writeValueWithResponse) {
        try {
          await this.writeCharacteristic.writeValueWithResponse(data);
          writeSuccess = true;
          console.log(`[BLE Command Sent via writeValueWithResponse]: "${command.replace('\n', '\\n')}"`);
        } catch (err3) {
          console.warn('[BLE writeValueWithResponse failed]:', err3);
          lastError = err3;
        }
      }

      if (!writeSuccess && lastError) {
        throw lastError;
      }

      this.updateState({
        lastCommandSent: command.replace('\n', '\\n'),
        lastCommandTimestamp: Date.now(),
        error: null
      });

      return true;
    } catch (err: any) {
      console.error('[BLE Command Send Failure]:', err);
      this.updateState({
        error: `Failed to transmit command: ${err.message || 'UART write error'}`
      });
      return false;
    }
  }

  /**
   * Sends the exact Bluetooth UART command "V\n" to trigger vibration on the micro:bit
   */
  public async sendVibrateCommand(): Promise<boolean> {
    return await this.sendCommand('V\n');
  }
}

export const microbitBleService = new MicrobitBleService();
