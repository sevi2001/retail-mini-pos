
import "dotenv/config";
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [email, serviceAccountPath] = process.argv.slice(2);

if (!email || !serviceAccountPath) {
  throw new Error(
    "Usage: node scripts/set-cashier.mjs EMAIL PATH_TO_SERVICE_ACCOUNT_JSON"
  );
}

const serviceAccount = JSON.parse(
  readFileSync(serviceAccountPath, "utf8")
);

const app = initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth(app);

const user = await auth.getUserByEmail(email);

await auth.setCustomUserClaims(user.uid, {
  ...user.customClaims,
  manager: false,
  cashier: true,
});

console.log("Cashier role assigned successfully.");
console.log("User:", user.email);
