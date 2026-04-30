#!/usr/bin/env python3
"""
=============================================
Bhoomi Gateway — Raspberry Pi LoRa Receiver
Complete Working Code
=============================================

WIRING (RPi GPIO → Ra-02):
───────────────────────────
Pin 1  (3.3V) → VCC   ← NEVER USE 5V
Pin 6  (GND)  → GND
Pin 19 (MOSI) → MOSI
Pin 21 (MISO) → MISO
Pin 23 (SCK)  → SCK
Pin 24 (CE0)  → NSS (CS)
Pin 22 (GPIO25) → RST
Pin 18 (GPIO24) → DIO0

INSTALL LIBRARIES:
──────────────────
sudo pip3 install adafruit-circuitpython-rfm9x
sudo pip3 install RPi.GPIO

ENABLE SPI:
───────────
sudo raspi-config → Interface Options → SPI → Enable
sudo reboot
"""

import time
import busio
import digitalio
import board
import adafruit_rfm9x
from datetime import datetime

# ─── LoRa Settings (MUST match ESP32 exactly) ───
LORA_FREQ       = 433.0    # MHz
LORA_SF         = 7        # Spreading factor
LORA_BW         = 125000   # Bandwidth Hz
LORA_CR         = 5        # Coding rate
LORA_SYNC_WORD  = 0x12     # Sync word

def init_lora():
    """Initialize LoRa module"""
    print("[LORA] Initializing Ra-02...")

    try:
        # SPI setup
        spi = busio.SPI(board.SCK, MOSI=board.MOSI, MISO=board.MISO)

        # Pin setup
        cs  = digitalio.DigitalInOut(board.CE0)    # GPIO8  Pin 24
        rst = digitalio.DigitalInOut(board.D25)    # GPIO25 Pin 22

        # Init RFM9x at 433MHz
        rfm9x = adafruit_rfm9x.RFM9x(spi, cs, rst, LORA_FREQ)

        # Settings — MUST match ESP32
        rfm9x.spreading_factor = LORA_SF
        rfm9x.signal_bandwidth = LORA_BW
        rfm9x.coding_rate      = LORA_CR
        rfm9x.sync_word        = LORA_SYNC_WORD
        rfm9x.tx_power         = 17

        print("[LORA] Init OK!")
        print(f"[LORA] Freq:{LORA_FREQ}MHz SF:{LORA_SF} "
              f"BW:{LORA_BW//1000}kHz CR:4/{LORA_CR} "
              f"SW:{hex(LORA_SYNC_WORD)}")
        return rfm9x

    except Exception as e:
        print(f"[LORA] Init FAILED: {e}")
        print("[LORA] Check wiring and SPI enabled!")
        return None


def parse_packet(raw):
    """
    Parse ESP32 packet format:
    NODE:1|V:3.85|P:72|S:OK|PKT:5
    """
    try:
        msg  = raw.decode("utf-8").strip()
        data = {}

        for part in msg.split("|"):
            if ":" in part:
                k, v = part.split(":", 1)
                data[k] = v

        return {
            "raw"    : msg,
            "node"   : data.get("NODE", "?"),
            "voltage": float(data.get("V", 0)),
            "percent": int(data.get("P", 0)),
            "status" : data.get("S", "?"),
            "packet" : int(data.get("PKT", 0)),
        }
    except Exception as e:
        return {
            "raw"    : str(raw),
            "node"   : "?",
            "voltage": 0,
            "percent": 0,
            "status" : "PARSE_ERR",
            "packet" : -1,
        }


def print_packet(parsed, rssi):
    """Pretty print received packet"""
    now = datetime.now().strftime("%H:%M:%S")
    print(f"\n{'─'*45}")
    print(f"  [{now}] Packet received!")
    print(f"  Node    : {parsed['node']}")
    print(f"  Battery : {parsed['voltage']}V ({parsed['percent']}%)")
    print(f"  Status  : {parsed['status']}")
    print(f"  Pkt #   : {parsed['packet']}")
    print(f"  RSSI    : {rssi} dBm")
    print(f"  Raw     : {parsed['raw']}")
    print(f"{'─'*45}")


def main():
    print("╔══════════════════════════════╗")
    print("║  Bhoomi Gateway  v3.0        ║")
    print("║  LoRa 433MHz Receiver        ║")
    print("╚══════════════════════════════╝")

    # Init LoRa
    rfm9x = init_lora()
    if rfm9x is None:
        print("[ERROR] Cannot start — LoRa init failed!")
        return

    print("\n[SYS] Listening for packets...")
    print("[SYS] Press Ctrl+C to stop\n")

    total_received = 0
    wait_count     = 0

    while True:
        try:
            # Wait for packet (5 second timeout)
            packet = rfm9x.receive(timeout=5.0)

            if packet is None:
                wait_count += 1
                print(f"[WAIT] No packet... ({wait_count * 5}s elapsed, "
                      f"total received: {total_received})")

            else:
                total_received += 1
                rssi   = rfm9x.last_rssi
                parsed = parse_packet(packet)
                print_packet(parsed, rssi)

                # Optional: Save to file
                # with open("bhoomi_data.csv", "a") as f:
                #     f.write(f"{datetime.now()},{parsed['node']},"
                #             f"{parsed['voltage']},{parsed['percent']},"
                #             f"{parsed['status']},{rssi}\n")

        except KeyboardInterrupt:
            print(f"\n[SYS] Stopped. Total packets received: {total_received}")
            break

        except Exception as e:
            print(f"[ERROR] {e}")
            print("[SYS] Restarting LoRa in 3 seconds...")
            time.sleep(3)
            rfm9x = init_lora()
            if rfm9x is None:
                print("[ERROR] Reinit failed, waiting 10s...")
                time.sleep(10)


if __name__ == "__main__":
    main()
