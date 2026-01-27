import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];

  try {
    const parts = token.split('.');
    // Decodificamos sin verificar firma (confiamos en Auth.js)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    if (!payload.email) return res.status(401).json({ message: "No email in token" });

    const customerModule = req.scope.resolve(Modules.CUSTOMER);

    // ✅ CORRECCIÓN: Quitamos los corchetes []
    // Guardamos TODO el array en la variable 'customers'
    const customers = await customerModule.listCustomers(
      { email: payload.email },
      { relations: ["addresses"] }
    );

    // ✅ Ahora sí accedemos al primer elemento
    const customer = customers[0];

    if (!customer) {
      console.log(`❌ Backend: No encontré customer con email ${payload.email}`);
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.json({ customer });

  } catch (e) {
    console.error("🔥 Error en keycloak-me:", e);
    return res.status(500).json({ error: e.message });
  }
}
