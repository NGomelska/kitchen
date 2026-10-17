/* Налаштування Firebase. Поки тут null — застосунок працює локально, тільки на цьому пристрої.
   Коли з'явиться проєкт у Firebase, сюди вставляється firebaseConfig і пошти родини. */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAp0cTH18yuWqLd8DPFdt1zdLdybZFXCg0",
  authDomain: "kitchen-a6a7a.firebaseapp.com",
  projectId: "kitchen-a6a7a",
  storageBucket: "kitchen-a6a7a.firebasestorage.app",
  messagingSenderId: "785205898021",
  appId: "1:785205898021:web:a7dcd7b571704f246208cc"
};
/* приклад:
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "kuhnia-xxxx.firebaseapp.com",
  projectId: "kuhnia-xxxx",
  storageBucket: "kuhnia-xxxx.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
*/
/* Хто має доступ (Google-акаунти). Ті самі пошти — у правилах Firestore (firestore.rules). */
window.FAMILY_EMAILS = ["nadiya.gomelska@gmail.com", "holmoff@gmail.com"];
