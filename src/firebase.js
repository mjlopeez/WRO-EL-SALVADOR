import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDppwpi3BxHgrk_e2lLFqLdOjLlM8mJgTE",
  authDomain: "wro-el-salvador-2026.firebaseapp.com",
  projectId: "wro-el-salvador-2026",
  storageBucket: "wro-el-salvador-2026.firebasestorage.app",
  messagingSenderId: "791178046300",
  appId: "1:791178046300:web:11ee1b70b2bbbea5ab2f99",
  measurementId: "G-FVC0HP5ECV"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
