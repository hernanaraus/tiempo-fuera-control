import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getDatabase,
    ref,
    set,
    get,
    push,
    update,
    remove,
    onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// =========================================================================
// REEMPLAZA ESTE OBJETO CON LAS CREDENCIALES DE TU PROYECTO EN FIREBASE
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAF-RevThB8a_bNjLYhAR1gaQLQe39d8c4",
  authDomain: "tiempo-fuera-control.firebaseapp.com",
  databaseURL: "https://tiempo-fuera-control-default-rtdb.firebaseio.com",
  projectId: "tiempo-fuera-control",
  storageBucket: "tiempo-fuera-control.firebasestorage.app",
  messagingSenderId: "454927378744",
  appId: "1:454927378744:web:4bf8f0dc2565a8969779cd",
  measurementId: "G-9C7R2YMSJY"
};

// Lista blanca de administradores autorizados
export const ALLOWED_ADMINS = [
    "hernan.araus@gmail.com",
    "contacto@tiempofuera.cl"
];

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export function isAuthorizedEmail(email) {
    if (!email) return false;
    return ALLOWED_ADMINS.includes(email.trim().toLowerCase());
}

export async function loginAdminWithGoogle() {
    const result = await signInWithPopup(auth, provider);
    const email = result.user?.email || "";
    if (!isAuthorizedEmail(email)) {
        await signOut(auth);
        throw new Error(`Acceso denegado para ${email}. Solo cuentas administradoras autorizadas de Tiempo Fuera.`);
    }
    return result.user;
}

export async function logoutAdmin() {
    await signOut(auth);
}

export function watchAdminAuth(onAuthorized, onDeniedOrSignedOut) {
    return onAuthStateChanged(auth, async (user) => {
        if (user && isAuthorizedEmail(user.email)) {
            onAuthorized(user);
        } else {
            if (user) {
                await signOut(auth);
                onDeniedOrSignedOut(`El correo ${user.email} no tiene permisos de administrador.`);
            } else {
                onDeniedOrSignedOut(null);
            }
        }
    });
}

export { ref, set, get, push, update, remove, onValue };
