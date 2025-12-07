import os
import socket
import ssl


def check_smtp(host: str, port: int, use_ssl: bool) -> None:
    print(f"--- Testing connection to {host}:{port} (SSL={use_ssl}) ---")
    try:
        print(
            "Environment Proxies: "
            f"HTTP={os.environ.get('http_proxy')}, "
            f"HTTPS={os.environ.get('https_proxy')}, "
            f"ALL={os.environ.get('all_proxy')}"
        )
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        if use_ssl:
            context = ssl.create_default_context()
            sock = context.wrap_socket(sock, server_hostname=host)
        sock.connect((host, port))
        print("Connected! Waiting for greeting...")
        resp = sock.recv(1024)
        print(f"Raw Response: {resp}")
        if resp.startswith(b"220"):
            print("✅ SMTP Handshake Successful!")
        else:
            print("❌ Malformed/Unexpected Response (Likely Proxy/Firewall)")
        sock.close()
    except Exception as exc:
        print(f"❌ Connection Error: {exc}")
    print("-" * 50)


if __name__ == "__main__":
    check_smtp("smtp.qq.com", 465, True)   # Implicit SSL
    check_smtp("smtp.qq.com", 587, False)  # STARTTLS (plain handshake first)
