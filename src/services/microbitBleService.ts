/**
 * BBC micro:bit Web Bluetooth UART Service
 * 
 * Single unified Bluetooth UART connection for both:
 * 1. Sending commands (e.g. 'V\n' for vibration motor)
 * 2. Continuously reading VL53L0X Time-of-Flight distance sensor values (in millimeters)
 */

import { formatDistance } from '../utils/formatDistance';

// Standard Nordic Semiconductor UART Service (MakeCode default BLE UART & Nordic NUS)
const NORDIC_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NORDIC_UART_RX_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write characteristic (Vibrate 'V\n')
const NORDIC_UART_TX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify/Read characteristic (VL53L0X Distance)

// Micro:bit Custom Bluetooth UART Service (MakeCode Bluetooth UART extension)
const MB_UART_SERVICE = 'e95d0753-251d-470a-a062-fa1922dfa9a8';
const MB_UART_RX_CHAR = 'e95d5404-251d-470a-a062-fa1922dfa9a8'; // Write characteristic
const MB_UART_TX_CHAR = 'e95d0d2d-251d-470a-a062-fa1922dfa9a8'; // Notify characteristic

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
    error: null
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
   * Connects to the BBC micro:bit via Web Bluetooth with a 15-second timeout.
   * Discovers both write (RX) and notify (TX) characteristics from the active UART service.
   * Reuses this exact same GATT connection for both Vibrate and Distance streaming.
   */
  public async connect(): Promise<boolean> {
    // If already connected and ready, return immediately
    if (this.state.isConnected && this.server && this.server.connected && this.writeCharacteristic) {
      this.updateState({ isConnecting: false, error: null });
      return true;
    }

    if (this.isConnectingLock) {
      return false;
    }

    if (!this.isBluetoothSupported()) {
      this.updateState({
        isConnecting: false,
        error: 'Web Bluetooth is not supported in Safari on iPadOS. Please open this app in Bluefy browser.'
      });
      return false;
    }

    this.isConnectingLock = true;
    this.updateState({ isConnecting: true, error: null });

    // 15-second connection timeout guard
    let connectionTimeout: any = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      connectionTimeout = setTimeout(() => {
        reject(new Error('Connection timed out after 15s. Ensure the micro:bit is powered on and within Bluetooth range.'));
      }, 15000);
    });

    try {
      const connectOperation = async () => {
        const navBluetooth = (navigator as any).bluetooth;

        // Request Bluetooth device matching micro:bit
        let device: any = null;
        try {
          device = await navBluetooth.requestDevice({
            filters: [
              { namePrefix: 'BBC micro:bit' },
              { namePrefix: 'micro:bit' },
              { namePrefix: 'BBC' }
            ],
            optionalServices: [
              NORDIC_UART_SERVICE,
              MB_UART_SERVICE,
              'generic_access',
              'generic_attribute'
            ]
          });
        } catch (filterErr: any) {
          if (filterErr.name === 'NotFoundError' || filterErr.message?.includes('User cancelled')) {
            throw filterErr;
          }
          // Fallback to acceptAllDevices
          console.warn('Filtered requestDevice failed, falling back to acceptAllDevices:', filterErr);
          device = await navBluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
              NORDIC_UART_SERVICE,
              MB_UART_SERVICE,
              'generic_access'
            ]
          });
        }

        if (!device) {
          throw new Error('No micro:bit device was selected.');
        }

        this.device = device;
        device.removeEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));
        device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

        // Connect GATT Server
        console.log('Connecting to GATT Server on micro:bit...');
        const server = await device.gatt.connect();
        this.server = server;

        let writeChar: any = null;
        let notifyChar: any = null;

        // 1. Try Nordic UART Service first
        try {
          const service = await server.getPrimaryService(NORDIC_UART_SERVICE);
          if (service) {
            try {
              writeChar = await service.getCharacteristic(NORDIC_UART_RX_CHAR);
            } catch (rxErr) {
              console.warn('Nordic RX characteristic search:', rxErr);
            }
            try {
              notifyChar = await service.getCharacteristic(NORDIC_UART_TX_CHAR);
            } catch (txErr) {
              console.warn('Nordic TX characteristic search:', txErr);
            }
          }
        } catch (nordicErr) {
          console.warn('Nordic primary service lookup:', nordicErr);
        }

        // 2. Try micro:bit Custom UART Service if not found
        if (!writeChar && !notifyChar) {
          try {
            const mbService = await server.getPrimaryService(MB_UART_SERVICE);
            if (mbService) {
              try {
                writeChar = await mbService.getCharacteristic(MB_UART_RX_CHAR);
              } catch (rxErr) {
                console.warn('micro:bit RX characteristic search:', rxErr);
              }
              try {
                notifyChar = await mbService.getCharacteristic(MB_UART_TX_CHAR);
              } catch (txErr) {
                console.warn('micro:bit TX characteristic search:', txErr);
              }
            }
          } catch (mbErr) {
            console.warn('micro:bit custom UART service lookup:', mbErr);
          }
        }

        // 3. Fallback: inspect all services on GATT server
        if (!writeChar && !notifyChar && server.getPrimaryServices) {
          try {
            const services = await server.getPrimaryServices();
            for (const s of services) {
              try {
                const chars = await s.getCharacteristics();
                for (const c of chars) {
                  const uuid = c.uuid.toLowerCase();
                  if (uuid.includes('6e400002') || uuid.includes('5404') || c.properties?.write || c.properties?.writeWithoutResponse) {
                    if (!writeChar) writeChar = c;
                  }
                  if (uuid.includes('6e400003') || uuid.includes('0d2d') || c.properties?.notify || c.properties?.indicate) {
                    if (!notifyChar) notifyChar = c;
                  }
                }
              } catch (charErr) {
                // Ignore service inspection errors
              }
            }
          } catch (servErr) {
            console.warn('Error querying all primary services:', servErr);
          }
        }

        if (!writeChar && !notifyChar) {
          throw new Error('Connected to micro:bit, but UART characteristics were not found. Please verify the MakeCode Bluetooth UART code is flashed.');
        }

        this.writeCharacteristic = writeChar;
        this.notifyCharacteristic = notifyChar;

        // Set connected state immediately so Vibrate works without delay
        this.updateState({
          isConnected: true,
          isConnecting: false,
          deviceName: device.name || 'BBC micro:bit',
          error: null
        });

        // Asynchronously start notifications on TX characteristic (does not block Vibrate)
        if (notifyChar && (notifyChar.properties?.notify || notifyChar.properties?.indicate)) {
          notifyChar.startNotifications()
            .then(() => {
              notifyChar.removeEventListener('characteristicvaluechanged', this.handleIncomingUartData.bind(this));
              notifyChar.addEventListener('characteristicvaluechanged', this.handleIncomingUartData.bind(this));
              console.log('VL53L0X UART distance notifications successfully started.');
            })
            .catch((notifErr: any) => {
              console.warn('Note: TX notifications failed to start (vibrate write remains fully operational):', notifErr);
            });
        }

        return true;
      };

      const result = await Promise.race([connectOperation(), timeoutPromise]);
      clearTimeout(connectionTimeout);
      this.isConnectingLock = false;
      return result;
    } catch (err: any) {
      clearTimeout(connectionTimeout);
      this.isConnectingLock = false;
      console.warn('Bluetooth connection error:', err);

      const isUserCancel = err.name === 'NotFoundError' || (err.message && err.message.includes('User cancelled'));
      this.updateState({
        isConnected: false,
        isConnecting: false,
        error: isUserCancel ? null : (err.message || 'Failed to connect to micro:bit')
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
      console.warn('Error parsing micro:bit UART packet:', parseErr);
    }
  }

  /**
   * Disconnect from the micro:bit
   */
  public disconnect() {
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
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.server = null;
    this.receiveBuffer = '';
    this.isConnectingLock = false;
    this.updateState({
      isConnected: false,
      isConnecting: false,
      deviceName: null,
      isLiveSensorActive: false
    });
  }

  /**
   * Sends raw string command to the micro:bit UART (reusing the same connection)
   * @param command Command string to send (e.g. "V\n")
   */
  public async sendCommand(command: string): Promise<boolean> {
    // If not connected, attempt connection first
    if (!this.state.isConnected || !this.writeCharacteristic || !this.server?.connected) {
      const connected = await this.connect();
      if (!connected || !this.writeCharacteristic) {
        return false;
      }
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(command);
      
      let writeSuccess = false;
      let lastError: any = null;

      // 1. Try standard writeValue (widely supported across Web Bluetooth & Bluefy)
      if (this.writeCharacteristic.writeValue) {
        try {
          await this.writeCharacteristic.writeValue(data);
          writeSuccess = true;
        } catch (err1) {
          lastError = err1;
        }
      }

      // 2. Try writeValueWithoutResponse if not written
      if (!writeSuccess && this.writeCharacteristic.writeValueWithoutResponse) {
        try {
          await this.writeCharacteristic.writeValueWithoutResponse(data);
          writeSuccess = true;
        } catch (err2) {
          lastError = err2;
        }
      }

      // 3. Try writeValueWithResponse if not written
      if (!writeSuccess && this.writeCharacteristic.writeValueWithResponse) {
        try {
          await this.writeCharacteristic.writeValueWithResponse(data);
          writeSuccess = true;
        } catch (err3) {
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
      console.error('Failed to send UART command to micro:bit:', err);
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
