// The menu.
//
// PREVIEW. Basil has not published a menu we could read, so every name,
// description and price here stands in until they send their card. What is
// theirs: the five sections their highlights name (pizza, pasta, sandwich,
// lasagna, friends), the square pizza by the tray and the focaccia in their
// posts, the kraft bowls, and every photograph — each one is a frame from their
// own feed. Prices are set against real Tabriz pizza-and-pasta menus of 2026,
// in Toman.
//
// photo  a whole frame of theirs, for the item sheet
// thumb  the dish cropped out of that frame, for the menu row
// art    the doodle a dish without a photograph wears (their highlight style)

export const CATEGORIES = [
  { id: "pizza", name: "Pizza", fa: "پیتزا", art: "pizza" },
  { id: "taglio", name: "Al taglio", fa: "پیتزا برشی", art: "slice", sub: "Square pizza, by the slice or the tray" },
  { id: "pasta", name: "Pasta", fa: "پاستا", art: "pasta" },
  { id: "lasagna", name: "Lasagna", fa: "لازانیا", art: "lasagna" },
  { id: "sandwich", name: "Sandwich", fa: "ساندویچ", art: "sandwich" },
  { id: "starters", name: "Starters & salads", short: "Salads", fa: "پیش‌غذا و سالاد", art: "salad" },
  { id: "drinks", name: "Drinks", fa: "نوشیدنی", art: "drink" },
  { id: "coffee", name: "Coffee", fa: "قهوه", art: "coffee" },
  { id: "desserts", name: "Desserts", fa: "دسر", art: "dessert" },
];

export const OPTION_GROUPS = {
  crust: { name: "Make it", choices: [{ id: "std", label: "As it comes" }, { id: "cheese", label: "Extra mozzarella", add: 140000 }, { id: "jalapeno", label: "Add jalapeño", add: 60000 }] },
  dip: { name: "A dip for the crust", choices: [{ id: "none", label: "No thanks" }, { id: "garlic", label: "Garlic mayo", add: 50000 }, { id: "honey", label: "Hot honey", add: 70000 }] },
  tray: { name: "The tray", choices: [{ id: "one", label: "One kind" }, { id: "half", label: "Half and half", add: 150000 }] },
  pasta: { name: "Add", choices: [{ id: "none", label: "As it comes" }, { id: "chicken", label: "Grilled chicken", add: 220000 }, { id: "parm", label: "Extra parmesan", add: 90000 }] },
  bowl: { name: "Bowl", choices: [{ id: "reg", label: "Regular" }, { id: "big", label: "Big bowl", add: 250000 }] },
  bread: { name: "Bread", choices: [{ id: "focaccia", label: "Focaccia" }, { id: "ciabatta", label: "Ciabatta" }] },
  size: { name: "Size", choices: [{ id: "reg", label: "Regular" }, { id: "lg", label: "Large", add: 60000 }] },
  shot: { name: "Espresso", choices: [{ id: "single", label: "Single" }, { id: "double", label: "Double", add: 80000 }] },
  sweet: { name: "Sweetness", choices: [{ id: "normal", label: "As it comes" }, { id: "less", label: "Less sweet" }, { id: "none", label: "No sugar" }] },
  ice: { name: "Ice", choices: [{ id: "normal", label: "Normal ice" }, { id: "light", label: "Light ice" }] },
};

const I = (id, cat, name, fa, price, desc, more = {}) => ({ id, cat, name, fa, price, desc, ...more });

export const ITEMS = [
  /* ---------------------------------------------------------------- pizza */
  I("margherita", "pizza", "Margherita", "مارگاریتا", 890000,
    "Tomato, fior di latte, olive oil and fresh basil. The one everything else is measured against.",
    { tag: "Classic", options: ["crust", "dip"] }),
  I("ham-tomato", "pizza", "Ham & Roast Tomato", "ژامبون و گوجه کبابی", 1290000,
    "Beef ham, slow-roasted tomatoes, mozzarella, crushed pistachio and torn basil on a charred crust.",
    { photo: "pizza-ham", thumb: "pizza-ham-sq", tag: "Signature", options: ["crust", "dip"] }),
  I("pepperoni", "pizza", "Pepperoni Piccante", "پپرونی تند", 1190000,
    "Beef pepperoni that cups and crisps in the oven, mozzarella, tomato and sliced jalapeño.",
    { photo: "pepperoni", thumb: "pepperoni-sq", tag: "Hot", hot: true, options: ["crust", "dip"] }),
  I("quattro", "pizza", "Quattro Formaggi", "چهار پنیر", 1350000,
    "Mozzarella, gorgonzola, parmesan and smoked cheese — no tomato, a drizzle of honey if you like.",
    { options: ["crust", "dip"] }),
  I("funghi", "pizza", "Funghi & Truffle", "قارچ و ترافل", 1250000,
    "Roasted mushrooms, truffle cream, mozzarella, parmesan and thyme.", { options: ["crust", "dip"] }),
  I("pesto-chicken", "pizza", "Pesto Chicken", "مرغ پستو", 1190000,
    "Basil pesto for a base, grilled chicken, mozzarella, cherry tomatoes and rocket.", { options: ["crust", "dip"] }),
  I("vegetariana", "pizza", "Vegetariana", "سبزیجات", 990000,
    "Peppers, courgette, olives, red onion, mushrooms and mozzarella.", { options: ["crust", "dip"] }),

  /* ----------------------------------------------------------- al taglio */
  I("tray", "taglio", "Tray for Friends", "سینی پیتزا برای جمع", 3250000,
    "A whole Roman tray, twelve squares, golden on the bottom. Feeds four to six.",
    { photo: "storefront", thumb: "tray", tag: "For 4–6", options: ["tray"] }),
  I("slice-rossa", "taglio", "Slice · Rossa", "برش روسا", 290000,
    "A square of the tray: tomato, oregano and olive oil on an airy, crisp base."),
  I("slice-pepperoni", "taglio", "Slice · Pepperoni", "برش پپرونی", 360000,
    "A square of the tray with mozzarella and pepperoni."),
  I("slice-patate", "taglio", "Slice · Patate & Rosemary", "برش سیب‌زمینی و رزماری", 320000,
    "Thin potato, rosemary, sea salt and mozzarella."),

  /* ---------------------------------------------------------------- pasta */
  I("alfredo", "pasta", "Fettuccine Alfredo", "فتوچینی آلفردو", 1090000,
    "Parmesan cream, grilled chicken and mushrooms. In the kraft bowl, to stay or to go.",
    { tag: "Popular", options: ["pasta", "bowl"] }),
  I("arrabbiata", "pasta", "Penne all'Arrabbiata", "پنه آرابیاتا", 790000,
    "Tomato, garlic and chilli, finished with basil and parmesan.", { tag: "Hot", hot: true, options: ["pasta", "bowl"] }),
  I("bolognese", "pasta", "Spaghetti Bolognese", "اسپاگتی بلونز", 990000,
    "A slow beef ragù with a little red wine vinegar, over spaghetti.", { options: ["pasta", "bowl"] }),
  I("pesto-pasta", "pasta", "Penne Pesto", "پنه پستو", 950000,
    "Basil pesto, parmesan and toasted pine nuts.", { options: ["pasta", "bowl"] }),
  I("rose", "pasta", "Rigatoni Rosé", "ریگاتونی رزه", 1050000,
    "Tomato-cream sauce, beef meatballs and parmesan.", { options: ["pasta", "bowl"] }),
  I("mac", "pasta", "Mac & Cheese al Forno", "مک اند چیز تنوری", 890000,
    "Macaroni in three cheeses, baked until the top crackles.", { options: ["bowl"] }),

  /* -------------------------------------------------------------- lasagna */
  I("lasagna", "lasagna", "Lasagna Classica", "لازانیا کلاسیک", 1150000,
    "Beef ragù, béchamel and mozzarella between fresh sheets, baked and served in the bowl.",
    { photo: "guest", thumb: "bowl", tag: "Signature" }),
  I("lasagna-pollo", "lasagna", "Lasagna Pollo e Funghi", "لازانیا مرغ و قارچ", 1090000,
    "Chicken, mushrooms and a parmesan béchamel."),
  I("lasagna-verde", "lasagna", "Lasagna Verde", "لازانیا سبز", 990000,
    "Spinach, ricotta and basil, with a tomato top."),

  /* ------------------------------------------------------------- sandwich */
  I("focaccia-chicken", "sandwich", "Focaccia Chicken Pesto", "فوکاچیا مرغ پستو", 790000,
    "Our focaccia, split and filled with grilled chicken, pesto, mozzarella and tomato, pressed hot.",
    { photo: "focaccia", thumb: "focaccia-sq", tag: "New", options: ["bread"] }),
  I("caprese-panino", "sandwich", "Panino Caprese", "پنینی کاپرزه", 690000,
    "Mozzarella, tomato, basil and olive oil.", { options: ["bread"] }),
  I("polpette", "sandwich", "Polpette Sub", "ساب میت‌بال", 850000,
    "Beef meatballs in tomato sauce, under melted mozzarella.", { options: ["bread"] }),
  I("chicken-parm", "sandwich", "Chicken Parm", "مرغ پارمزان", 890000,
    "Crumbed chicken, marinara and parmesan, toasted."),

  /* ------------------------------------------------------------- starters */
  I("garlic-bread", "starters", "Garlic Bread", "نان سیر", 390000,
    "From the pizza oven, with garlic butter and mozzarella."),
  I("arancini", "starters", "Arancini", "آرانچینی", 590000,
    "Three crisp risotto balls with a mozzarella heart, and tomato to dip."),
  I("fries", "starters", "Parmesan Fries", "سیب‌زمینی پارمزان", 420000,
    "Fries under parmesan and parsley, garlic mayo on the side."),
  I("caesar", "starters", "Caesar Salad", "سالاد سزار", 790000,
    "Cos, grilled chicken, focaccia croutons and parmesan."),
  I("caprese", "starters", "Caprese", "سالاد کاپرزه", 690000,
    "Tomato, mozzarella, basil and good olive oil."),

  /* --------------------------------------------------------------- drinks */
  I("basil-lemonade", "drinks", "Basil Lemonade", "لیموناد ریحان", 290000,
    "The house lemonade: lemon, fresh basil and soda.", { tag: "House", options: ["sweet", "ice"] }),
  I("peach-tea", "drinks", "Peach Iced Tea", "آیس‌تی هلو", 260000, "Brewed black tea, peach and ice.", { options: ["sweet", "ice"] }),
  I("cola", "drinks", "Cola", "نوشابه", 120000, "A chilled can and a glass of ice."),
  I("doogh", "drinks", "Doogh", "دوغ", 110000, "Yoghurt, dried mint and a pinch of salt."),
  I("sparkling", "drinks", "Sparkling Water", "آب گازدار", 90000, "Ice and a slice of lemon."),
  I("water", "drinks", "Mineral Water", "آب معدنی", 60000, "Still."),

  /* --------------------------------------------------------------- coffee */
  I("espresso", "coffee", "Espresso", "اسپرسو", 190000, "Pulled short, the Italian way.", { options: ["shot"] }),
  I("americano", "coffee", "Americano", "آمریکانو", 220000, "Espresso lengthened with hot water.", { options: ["size", "shot"] }),
  I("cappuccino", "coffee", "Cappuccino", "کاپوچینو", 270000, "Espresso, steamed milk, a deep cap of foam.", { options: ["size"] }),
  I("latte", "coffee", "Caffè Latte", "لاته", 280000, "Espresso and plenty of silky milk.", { options: ["size", "sweet"] }),

  /* ------------------------------------------------------------- desserts */
  I("tiramisu", "desserts", "Tiramisu", "تیرامیسو", 420000,
    "Espresso-soaked savoiardi and mascarpone, cocoa on top, made each morning.", { tag: "Signature" }),
  I("panna-cotta", "desserts", "Panna Cotta", "پاناکوتا", 360000, "Vanilla cream set soft, with a berry sauce."),
  I("nutella-pizza", "desserts", "Nutella Pizza", "پیتزا نوتلا", 690000,
    "A small pizza from the oven, Nutella, hazelnuts and powdered sugar. To share.", { tag: "To share" }),
  I("affogato", "desserts", "Affogato", "آفوگاتو", 330000, "Vanilla ice cream drowned in a hot espresso."),
];

const INDEX = new Map(ITEMS.map((i) => [i.id, i]));
export const byId = (id) => INDEX.get(id) || null;
export const inCat = (cat) => ITEMS.filter((i) => i.cat === cat);
export const catById = (id) => CATEGORIES.find((c) => c.id === id) || null;
/** The doodle a dish wears when it has no photograph: its own, or its section's. */
export const artOf = (item) => item?.art || catById(item?.cat)?.art || "pizza";

/** The dishes Home leads with: the ones they photographed, then the classics. */
export const SIGNATURES = ["ham-tomato", "pepperoni", "lasagna", "focaccia-chicken", "tray", "margherita", "alfredo", "tiramisu"];

/** Case-insensitive match on the English name, the Persian name or the description. */
export function searchItems(term) {
  const q = String(term || "").trim().toLowerCase();
  if (!q) return ITEMS;
  return ITEMS.filter((i) => i.name.toLowerCase().includes(q) || i.fa.includes(q) || i.desc.toLowerCase().includes(q));
}
