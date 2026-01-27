import requests
import json

API_URL = "http://172.17.0.1:8081/api/iam/clients"
ENV_FILE = ".env.development"

TARGET_VARS = [
    ["KEYCLOAK_CLIENT_ID","id"],
    ["NEXT_PUBLIC_KEYCLOAK_CLIENT_ID","id"],
    ["KEYCLOAK_CLIENT_SECRET","secret"],
]


def main():
    print("🔄 Obteniendo credenciales dinámicas de Keycloak...")

    try:
        response = requests.get(API_URL)
        response.raise_for_status()
    except Exception as e:
        print("❌ Error al llamar a la API:", e)
        return

    data = response.json()

    data2 = data.get("dashboard-client")
    client_id = data2.get("id")
    client_secret = data2.get("secret")
    realm = "quarkus"

    try:
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except FileNotFoundError:
        lines = []

    updated_lines = []

    for line in lines:
        stripped = line.strip()
        if "=" not in stripped or stripped.startswith("#"):
            updated_lines.append(line)
            continue

        key, _ = stripped.split("=", 1)
        if key in [e[0] for e in TARGET_VARS]:
            print(key)
            updated_lines.append(f"{key}={data2.get(key.split('_')[-1].lower(),'')}\n")
        else:
            updated_lines.append(line)

    # Escribir de nuevo
    with open(ENV_FILE, "w", encoding="utf-8") as f:
        f.writelines(updated_lines)

    print("✅ Variables actualizadas correctamente en .env")


if __name__ == "__main__":
    main()


