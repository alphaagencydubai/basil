// The business, and the rules the app plays by.
//
// FACT — from Basil's own Instagram (@basil.tabriz): the name in both scripts,
// "Italian restaurant", their line «باسیل؛ به وقت ایتالیا» (Basil — on Italy
// time), open 13:00 to 24:00, Valiasr · Roudaki in Tabriz, their map pin, their
// highlights (Pizza, Pasta, Sandwich, Lasagna, Friends), the self-order kiosk,
// the kraft bowls and the green tables in their posts.
// OURS — the club's numbers, the stamp card, the rewards, the friends' table,
// the staff passcode. Labelled as Alpha's proposal wherever they show.

export const STORAGE = "basil.";

export const BUSINESS = {
  name: "Basil",
  full: "Basil · Pasta & Pizza",
  fa: "باسیل",
  faFull: "باسیل | پاستا | پیتزا",
  street: "Valiasr, Roudaki",
  city: "Tabriz",
  addressFa: "تبریز، ولیعصر، رودکی",
  instagram: "basil.tabriz",
  // no telephone is published on their profile — the app talks to them in Instagram DM
  dm: "https://ig.me/m/basil.tabriz",
  maps: "https://maps.app.goo.gl/sfrn9LWadyC6HGVc8",
  // their own words, from the bio
  lineFa: "باسیل؛ به وقت ایتالیا",
  line: "Basil — on Italy time.",
  pillars: [
    { en: "Pizza from a hot oven", fa: "پیتزا از تنور داغ", icon: "pizza" },
    { en: "Pasta in a kraft bowl", fa: "پاستا در کاسه کرافت", icon: "pasta" },
    { en: "Order at the kiosk, or here", fa: "سفارش از کیوسک، یا همین‌جا", icon: "kiosk" },
  ],
};

/** Opening hours in minutes from midnight, every day of the week. */
export const HOURS = { open: 13 * 60, close: 24 * 60, note: "Daily" };

export const ORDER = {
  prepMinutes: 12,   // how long the preview's oven takes
  serveGrace: 6,     // after "ready", when the order counts as served and its leaves land
};

/* ------------------------------------------------------------------- club */
// "Basil Club" — leaves for every order, a stamp for every pizza. A proposal
// from Alpha, labelled as such wherever it is shown.
export const CLUB = {
  name: "Basil Club",
  unit: "leaves",
  unitOne: "leaf",
  tomanPerPoint: 10000,
  welcome: 100,
  referral: 150,
  stampsPerCard: 8,
  tiers: [
    { id: "amico", name: "Amico", fa: "دوست", at: 0, rate: 1,
      perks: ["A leaf for every 10,000 T", "A stamp for every pizza — the 8th is on us", "Tiramisu on the house in your birthday week"] },
    { id: "famiglia", name: "Famiglia", fa: "خانواده", at: 1500, rate: 1.25,
      perks: ["Leaves 25% faster", "First call on the friends' table at weekends", "Everything in Amico"] },
    { id: "nonna", name: "Nonna", fa: "مادربزرگ", at: 5000, rate: 1.5,
      perks: ["Leaves 50% faster", "Taste new pizzas before they reach the menu", "Everything in Famiglia"] },
  ],
};

export const REWARDS = [
  { id: "r-lemonade", name: "A basil lemonade on us", cost: 250, kind: "item", item: "basil-lemonade",
    note: "The house lemonade, with fresh basil" },
  { id: "r-tiramisu", name: "A dessert on us", cost: 500, kind: "cat", cat: "desserts",
    note: "Tiramisu, panna cotta or the Nutella pizza" },
  { id: "r-15", name: "15% off your order", cost: 900, kind: "pct", pct: 15, cap: 600000,
    note: "Up to 600,000 T off one order" },
  { id: "r-pizza", name: "A pizza on us", cost: 1800, kind: "cat", cat: "pizza",
    note: "Any pizza from the oven" },
];

/** The stamp card's prize: what the eighth pizza turns into. */
export const STAMP_PRIZE = { id: "s-pizza", name: "Your 8th pizza, on us", kind: "cat", cat: "pizza" };

/* ----------------------------------------------------------- reservations */
// Basil is a quick, bright room — tables at the window and the long table they
// share with friends. The friends' table is their "Friends" highlight, made bookable.
export const SPACES = [
  { id: "table", name: "A table", fa: "میز", icon: "table", min: 1, max: 4,
    note: "Two or four, by the window or under the tiles" },
  { id: "friends", name: "The friends' table", fa: "میز دوستان", icon: "friends", min: 5, max: 12,
    note: "The long green table, for a group — pizzas to share in the middle" },
  { id: "party", name: "A pizza party", fa: "جشن پیتزا", icon: "party", min: 8, max: 20,
    note: "Birthdays and team nights: trays of square pizza, a cake, the music up" },
];

export const RESERVE = {
  firstSlot: 13 * 60,
  lastSlot: 22 * 60 + 30,
  step: 30,
  leadMinutes: 60,
  days: 21,
};

/** The staff console's preview passcode: the hour Basil opens. */
export const STAFF = { passcode: "1300" };
