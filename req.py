import requests
import json

# --- CONFIGURACIÓN ---
BASE_URL = "http://localhost:9000"
EMAIL = "admin@medusa-test.com"  # Tu usuario admin
PASSWORD = "supersecret"  # Tu contraseña


def print_json(data):
    """Imprime JSON formateado y bonito"""
    print(json.dumps(data, indent=2))


def run_test():
    # ---------------------------------------------------------
    # PASO 1: OBTENER EL BEARER TOKEN (LOGIN)
    # ---------------------------------------------------------
    print(f"\n🔐 1. Iniciando sesión como {EMAIL}...")

    auth_url = f"{BASE_URL}/auth/user/emailpass"
    try:
        auth_res = requests.post(auth_url, json={"email": EMAIL, "password": PASSWORD})
        auth_res.raise_for_status()

        # Obtenemos el token del objeto de respuesta
        token = auth_res.json().get("token")

        if not token:
            print("❌ Error: La respuesta no trajo un token.")
            print_json(auth_res.json())
            return

        print(f"✅ Token recibido: {token[:15]}...")  # Mostramos solo el inicio

        # Configuramos los headers con el Bearer Token
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    except Exception as e:
        print(f"❌ Error al hacer login: {e}")
        return

    # ---------------------------------------------------------
    # PASO 2: CREAR UN TOUR (POST)
    # ---------------------------------------------------------
    print("\n🚀 2. Creando un Tour de prueba (POST)...")

    tour_payload = {
        "destination": "Python Bearer Test",
        "description": "Tour creado validando el Bearer Token",
        "duration_days": 3,
        "max_capacity": 15,
        "available_dates": ["2027-10-01"],
        "thumbnail": "https://placehold.co/400",
        "prices": {"adult": 200, "child": 100, "infant": 0, "currency_code": "usd"},
    }

    try:
        create_res = requests.post(
            f"{BASE_URL}/admin/tours", json=tour_payload, headers=headers
        )

        if create_res.status_code == 200:
            print("✅ Tour creado exitosamente.")
            print_json(create_res.json())
        else:
            print(f"❌ Falló la creación (Status {create_res.status_code}):")
            print(create_res.text)
            # Si falla aquí, no seguimos
            return
    except Exception as e:
        print(f"❌ Error de conexión al crear: {e}")
        return

    # ---------------------------------------------------------
    # PASO 3: EL ERROR (GET SIN CAMPOS)
    # ---------------------------------------------------------
    print("\n⚠️  3. Simulando el error del Frontend (GET sin 'fields')...")

    try:
        # Petición tal cual la tienes en React ahora (sin params de fields)
        bad_get_res = requests.get(f"{BASE_URL}/admin/tours", headers=headers)
        data = bad_get_res.json()
        tours = data.get("tours", [])

        if len(tours) > 0:
            first_tour = tours[0]
            # Verificamos si faltan datos clave
            if "destination" not in first_tour or first_tour["destination"] is None:
                print(
                    "🔴 CONFIRMADO: El servidor devuelve objetos vacíos si no pides 'fields'."
                )
                print("   Esto es lo que ves en tu tabla ahora mismo:")
                print_json(first_tour)
            else:
                print(
                    "❓ Curioso: Aquí sí devolvió datos. ¿Tu backend tiene un default?"
                )
                print_json(first_tour)
        else:
            print("   No hay tours para mostrar.")

    except Exception as e:
        print(f"❌ Error: {e}")

    # ---------------------------------------------------------
    # PASO 4: LA SOLUCIÓN (GET CON CAMPOS)
    # ---------------------------------------------------------
    print("\n✨ 4. Probando la solución (GET con fields=*)...")

    params = {
        "fields": "*",  # Esto pide todo: id, destination, prices, variants, etc.
        "limit": 5,
    }

    try:
        good_get_res = requests.get(
            f"{BASE_URL}/admin/tours", headers=headers, params=params
        )
        data = good_get_res.json()
        tours = data.get("tours", [])

        if len(tours) > 0 and tours[0].get("destination"):
            print("✅ ÉXITO TOTAL: Al enviar 'fields=*', recibimos toda la data.")
            print(f"   Destino: {tours[0]['destination']}")
            print(f"   ID: {tours[0]['id']}")
        else:
            print("❌ Aún con fields, algo falla. Revisa la base de datos.")
            print_json(data)

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    run_test()
