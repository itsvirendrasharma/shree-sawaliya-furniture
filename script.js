/* ==========================================================
   Shree Sawaliya Furniture — script.js
   Single-page shop: storefront, cart, checkout, admin panel.

   Where data lives
   - Products and categories ........ Supabase (public.products, public.categories)
   - Shop settings, banners, orders,
     customers, cart, language ....... this browser (localStorage)

   Admin writes to Supabase need a Supabase Auth session
   (Settings > Online database > Sign in). The browser-side admin
   password only opens the admin screens; it does NOT protect the
   database. Row Level Security does (see the SQL file/notes).
   ========================================================== */


/* Supabase client */
const SUPABASE_URL =
    "https://tvzmbuhgfywpvfxjwhlc.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_7Hpx6z7dscR9IPhYmkdWzQ_ZZulvMFA";

/* One client only. If the Supabase library did not load, the shop shows a
   clear error instead of crashing. */
const furnitureDB = (window.supabase && typeof window.supabase.createClient === "function")
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;


(function () {
    'use strict';

    /* ---------------------------------------------------------
       Basics
    --------------------------------------------------------- */
    var LS = { data: 'ssf_data_v1', cart: 'ssf_cart_v1', lang: 'ssf_lang_v1' };
    var DEFAULT_PASSWORD = 'admin123';   // change it after first login (Settings > Change password)
    var MAX_PRICE = 10000000;
    var MAX_STOCK = 100000;

    function $(s, el) { return (el || document).querySelector(s); }
    function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
    function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
    function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); }
    var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Turns "L-Shape Sofa!" into "l-shape-sofa" for database slugs. */
    function slugify(s) {
        var out = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return out || 'item';
    }
    function slugKey(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, ''); }
    /* Older versions used ids like "sb-12" or "p01". Database ids are plain numbers as text. */
    function normPid(id) { return String(id == null ? '' : id).replace(/^sb-/, ''); }

    /* Simple string hash (cyrb53). Only a light lock — see note at the top of this file. */
    function pwHash(str) {
        var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for (var i = 0; i < str.length; i++) {
            var ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    }
    function hashPw(p) { return pwHash('ssf:' + p); }

    /* ---------------------------------------------------------
       Icons
    --------------------------------------------------------- */
    var ICON = {
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
        close: '<path d="M6 6l12 12M18 6L6 18"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
        cart: '<path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
        home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
        grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
        box: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
        phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
        chart: '<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>',
        edit: '<path d="M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16z"/>',
        users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
        gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
        logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
        lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
        shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
        chat: '<path d="M4 20l1.3-4.2A8 8 0 1 1 8.2 19z"/>',
        check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
        left: '<path d="M15 5l-7 7 7 7"/>',
        right: '<path d="M9 5l7 7-7 7"/>',
        pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
        card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>'
    };
    function icon(n) {
        return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[n] || '') + '</svg>';
    }

    /* ---------------------------------------------------------
       Translations (English / Hindi)
    --------------------------------------------------------- */
    var T = {
        en: {
            skip: 'Skip to content', adminCaps: 'ADMIN', admin: 'Admin', menu: 'Menu', close: 'Close', cart: 'Cart',
            search: 'Search furniture…', home: 'Home', categories: 'Categories', products: 'Products', about: 'About us',
            contact: 'Contact', report: 'Report', manage: 'Manage products', customers: 'Customers', settings: 'Settings',
            logout: 'Logout', adminOnly: 'Admin only', offers: 'Offers', offerTitle: "Today's offer",
            offerText: 'Get {pct}% off on orders of {min} and above', contactUs: 'Contact us', call: 'Call', whatsapp: 'WhatsApp',
            shopNow: 'Shop now', viewAll: 'View all products', viewDetails: 'View details', addToCart: 'Add to cart',
            added: 'Added to cart', outOfStock: 'Out of stock', inStock: 'In stock', onlyLeft: 'Only {n} left', off: '{n}% off',
            all: 'All', sort: 'Sort', sortNew: 'Newest first', sortLow: 'Price: low to high', sortHigh: 'Price: high to low',
            noResults: 'No furniture found', noResultsHint: 'Try a different word or category.', clearFilters: 'Clear filters',
            items: '{n} items', shopByCat: 'Shop by category', popular: 'Popular furniture',
            perk1: 'Lowest prices', perk1d: 'Fair prices on every piece.',
            perk2: 'Pay your way', perk2d: 'UPI, cash on delivery, bank transfer.',
            perk3: 'Order on WhatsApp', perk3d: 'Send your order to the shop in one tap.',
            yourCart: 'Your cart', cartEmpty: 'Your cart is empty', cartEmptyHint: 'Add a few pieces to get started.',
            subtotal: 'Subtotal', discount: 'Offer discount', total: 'Total', checkout: 'Checkout', remove: 'Remove',
            addMore: 'Add {amt} more to get {pct}% off', offerWon: '{pct}% offer applied!', qty: 'Quantity',
            yourDetails: 'Your details', name: 'Full name', phone: 'Mobile number', address: 'Delivery address',
            note: 'Note (optional)', payment: 'Payment method',
            pUpi: 'UPI (GPay, PhonePe, Paytm)', pUpiD: 'Pay from any UPI app',
            pCod: 'Cash on delivery', pCodD: 'Pay when the order arrives',
            pBank: 'Bank transfer', pBankD: 'NEFT / IMPS',
            pCard: 'Card or net banking', pCardD: 'The shop sends a secure payment link',
            placeOrder: 'Place order', errName: 'Enter your name', errPhone: 'Enter a 10-digit mobile number',
            errAddress: 'Enter the delivery address', orderPlaced: 'Order placed', orderNo: 'Order number',
            thanks: 'Thank you, {name}!', payUpiNow: 'Pay with UPI app', upiId: 'UPI ID', copy: 'Copy', copied: 'Copied',
            bankDetails: 'Bank details', payLater: 'The shop will share payment details on call or WhatsApp.',
            codNote: 'Keep {amt} ready at delivery.', sendWa: 'Send order on WhatsApp', continueShop: 'Continue shopping',
            description: 'Description', buyNow: 'Buy now', askWa: 'Ask on WhatsApp', category: 'Category',
            aboutTitle: 'About us', contactTitle: 'Contact us', visitUs: 'Visit the shop', hours: 'Opening hours',
            email: 'Email', sendMsg: 'Send message', yourMsg: 'Your message', contactSoon: 'Contact details will be added soon.',
            openMaps: 'Open in Maps', msgFail: 'Add a phone or email in Settings to receive messages.',
            adminLogin: 'Admin login', password: 'Password', login: 'Log in', show: 'Show', hide: 'Hide',
            wrongPw: 'Wrong password', locked: 'Too many tries. Wait {n} seconds.', welcomeAdmin: 'Logged in as admin',
            loggedOut: 'Logged out', adminHint: 'Only the shop owner can open the admin area.',
            reportTitle: 'Report', revenue: 'Total sales', orders: 'Orders', pending: 'Pending', lowStock: 'Low stock',
            last7: 'Sales in the last 7 days', byCat: 'Sales by category', recentOrders: 'Recent orders',
            noOrders: 'No orders yet. Orders placed on the shop will show here.', exportCsv: 'Download CSV', status: 'Status',
            sPending: 'Pending', sConfirmed: 'Confirmed', sDelivered: 'Delivered', sCancelled: 'Cancelled',
            setup: 'Finish setup: add your phone, WhatsApp and UPI ID in Settings.', openSettings: 'Open Settings',
            paymentLbl: 'Payment', placedOn: 'Placed on',
            manageTitle: 'Manage products', addProduct: 'Add product', editProduct: 'Edit product', price: 'Price',
            mrp: 'Original price (optional)', stock: 'Stock', edit: 'Edit', delete: 'Delete', confirmDelete: 'Delete this product?',
            nameEn: 'Name (English)', nameHi: 'Name (Hindi, optional)', descEn: 'Description (English)',
            descHi: 'Description (Hindi, optional)', photos: 'Photos (up to 4)', addPhotos: 'Add photos',
            featured: 'Show on home page', save: 'Save', cancel: 'Cancel', saved: 'Saved', deleted: 'Deleted',
            fillRequired: 'Please fill the required fields.',
            saveFail: 'Could not save in this browser. Storage is full — use a smaller banner photo.',
            filterProducts: 'Search products…', noProducts: 'No products yet. Add your first one.',
            customersTitle: 'Customers', totalSpent: 'Total spent', lastOrder: 'Last order',
            noCustomers: 'Customers appear here after their first order.', searchCust: 'Search name or phone…',
            shopDetails: 'Shop details', shopName: 'Shop name', payAndOffer: 'Payment and offer', upiName: 'UPI account name',
            bankText: 'Bank details (shown to customers who choose bank transfer)', offerOn: 'Offer is on',
            offerMin: 'Minimum order amount (₹)', offerPct: 'Discount percent', catManage: 'Categories', addCat: 'Add category',
            catInUse: 'This category has products. Move or delete them first.', picture: 'Picture style',
            slides: 'Home page banners', addSlide: 'Add banner', editSlide: 'Edit banner', slideTitle: 'Headline (English)',
            slideTitleHi: 'Headline (Hindi)', slideSub: 'Small text (English)', slideSubHi: 'Small text (Hindi)',
            bgColor: 'Background colour', opens: 'Button opens', allProducts: 'All products', photo: 'Photo',
            useIllustration: 'No photo: show a picture of', changePw: 'Change password', curPw: 'Current password',
            newPw: 'New password (min 6 characters)', confPw: 'Confirm new password', pwChanged: 'Password changed',
            pwMismatch: 'Passwords do not match', pwShort: 'Use at least 6 characters',
            defaultPwWarn: 'You are using the starting password. Change it now.',
            backup: 'Backup and reset', backupNote: 'Settings, banners, orders and customers are saved in this browser only. Products and categories are in the online database. Download a backup regularly.',
            downloadBackup: 'Download backup', restoreBackup: 'Restore backup', resetData: 'Reset local data',
            confirmReset: 'Erase the settings, banners and orders saved in this browser? Products stay in the database.', restored: 'Backup restored',
            badFile: 'That file is not a valid backup.', aboutEn: 'About text (English)', aboutHi: 'About text (Hindi)',
            deleteSlide: 'Delete this banner?', stockShort: 'Stock',

            /* ---- online database (Supabase) ---- */
            loading: 'Loading products…',
            catalogError: 'Could not load products from the database',
            retry: 'Try again',
            catalogEmpty: 'No products in the shop yet',
            catalogEmptyHint: 'Please check back soon.',
            dbTitle: 'Online database',
            dbHelp: 'Products and categories are stored in Supabase. Sign in with the admin account to save changes.',
            dbSignIn: 'Sign in to database', dbSignOut: 'Sign out of database', dbEmail: 'Admin email',
            dbNotSignedIn: 'Not signed in to the database. Changes cannot be saved.',
            dbSignedInAs: 'Signed in as {email}',
            dbSignInFail: 'Sign-in failed. Check the email and password.',
            dbSignedIn: 'Signed in to the database', dbSignedOut: 'Signed out of the database',
            errRls: 'The database did not accept this change. Make sure you are signed in as admin and that the Row Level Security policies allow it.',
            errFk: 'This item is used by other records (such as orders) and cannot be deleted.',
            errDup: 'An item with the same unique value already exists.',
            errNetwork: 'Network problem. Check your internet and try again.',
            errExpired: 'Your database session expired. Sign in again.',
            errGeneric: 'Something went wrong.',
            errBadData: 'The database rejected the data',
            saving: 'Saving…',
            imageUrl: 'Image URL (saved to the database)',
            imageUrlHint: 'Paste a link that starts with https://',
            imageUrlBad: 'The image link must start with http:// or https://',
            devicePhotos: 'Photos from this device (preview only, not saved)',
            photosNotSaved: 'Saved. Device photos were not saved — paste an image URL to show a picture.',
            visibleInShop: 'Visible in shop', hidden: 'Hidden',
            confirmDeactivate: 'This product is linked to other records and cannot be deleted. Hide it from the shop instead?',
            deactivated: 'Product hidden from the shop',
            priceInvalid: 'Enter a price above 0 (up to 1,00,00,000).',
            stockInvalid: 'Stock must be a whole number from 0 to 100000.',
            mrpInvalid: 'Original price cannot be lower than the price.',
            nameExists: 'A product with this name already exists. Add it anyway?',
            noCategory: 'No category',
            catHiNote: 'Hindi category names need a name_hi column in the categories table.',
            stockHint: 'Stock is reduced in the database when you confirm an order, and given back if you cancel it.',
            orderStockFail: 'The order status was not changed because stock could not be updated.',
            cartUpdated: 'Some items in your cart are no longer available and were removed.'
        },
        hi: {
            skip: 'मुख्य सामग्री पर जाएँ', adminCaps: 'एडमिन', admin: 'एडमिन', menu: 'मेन्यू', close: 'बंद करें', cart: 'कार्ट',
            search: 'फ़र्नीचर खोजें…', home: 'होम', categories: 'श्रेणियाँ', products: 'उत्पाद', about: 'हमारे बारे में',
            contact: 'संपर्क', report: 'रिपोर्ट', manage: 'उत्पाद प्रबंधन', customers: 'ग्राहक', settings: 'सेटिंग्स',
            logout: 'लॉगआउट', adminOnly: 'सिर्फ़ एडमिन के लिए', offers: 'ऑफ़र', offerTitle: 'आज का ऑफ़र',
            offerText: '{min} और उससे ऊपर की खरीद पर {pct}% की छूट', contactUs: 'हमसे संपर्क करें', call: 'कॉल करें', whatsapp: 'WhatsApp',
            shopNow: 'अभी खरीदें', viewAll: 'सभी उत्पाद देखें', viewDetails: 'विवरण देखें', addToCart: 'कार्ट में जोड़ें',
            added: 'कार्ट में जोड़ा गया', outOfStock: 'स्टॉक में नहीं', inStock: 'स्टॉक में है', onlyLeft: 'सिर्फ़ {n} बचे हैं', off: '{n}% छूट',
            all: 'सभी', sort: 'क्रम', sortNew: 'नए पहले', sortLow: 'कीमत: कम से ज़्यादा', sortHigh: 'कीमत: ज़्यादा से कम',
            noResults: 'कोई फ़र्नीचर नहीं मिला', noResultsHint: 'कोई दूसरा शब्द या श्रेणी आज़माएँ।', clearFilters: 'फ़िल्टर हटाएँ',
            items: '{n} उत्पाद', shopByCat: 'श्रेणी के अनुसार खरीदें', popular: 'लोकप्रिय फ़र्नीचर',
            perk1: 'सबसे कम कीमत', perk1d: 'हर सामान पर वाजिब दाम।',
            perk2: 'अपने तरीके से भुगतान', perk2d: 'UPI, कैश ऑन डिलीवरी, बैंक ट्रांसफ़र।',
            perk3: 'WhatsApp पर ऑर्डर', perk3d: 'एक टैप में दुकान को ऑर्डर भेजें।',
            yourCart: 'आपका कार्ट', cartEmpty: 'आपका कार्ट खाली है', cartEmptyHint: 'शुरू करने के लिए कुछ सामान जोड़ें।',
            subtotal: 'कुल योग', discount: 'ऑफ़र छूट', total: 'कुल राशि', checkout: 'चेकआउट', remove: 'हटाएँ',
            addMore: '{pct}% छूट पाने के लिए {amt} का और सामान जोड़ें', offerWon: '{pct}% ऑफ़र लागू हो गया!', qty: 'मात्रा',
            yourDetails: 'आपकी जानकारी', name: 'पूरा नाम', phone: 'मोबाइल नंबर', address: 'डिलीवरी का पता',
            note: 'टिप्पणी (वैकल्पिक)', payment: 'भुगतान का तरीका',
            pUpi: 'UPI (GPay, PhonePe, Paytm)', pUpiD: 'किसी भी UPI ऐप से भुगतान करें',
            pCod: 'कैश ऑन डिलीवरी', pCodD: 'सामान मिलने पर भुगतान करें',
            pBank: 'बैंक ट्रांसफ़र', pBankD: 'NEFT / IMPS',
            pCard: 'कार्ड या नेट बैंकिंग', pCardD: 'दुकान सुरक्षित पेमेंट लिंक भेजेगी',
            placeOrder: 'ऑर्डर करें', errName: 'अपना नाम लिखें', errPhone: '10 अंकों का मोबाइल नंबर लिखें',
            errAddress: 'डिलीवरी का पता लिखें', orderPlaced: 'ऑर्डर हो गया', orderNo: 'ऑर्डर नंबर',
            thanks: 'धन्यवाद, {name}!', payUpiNow: 'UPI ऐप से भुगतान करें', upiId: 'UPI ID', copy: 'कॉपी करें', copied: 'कॉपी हो गया',
            bankDetails: 'बैंक विवरण', payLater: 'दुकान कॉल या WhatsApp पर भुगतान की जानकारी देगी।',
            codNote: 'डिलीवरी पर {amt} तैयार रखें।', sendWa: 'WhatsApp पर ऑर्डर भेजें', continueShop: 'खरीदारी जारी रखें',
            description: 'विवरण', buyNow: 'अभी खरीदें', askWa: 'WhatsApp पर पूछें', category: 'श्रेणी',
            aboutTitle: 'हमारे बारे में', contactTitle: 'संपर्क करें', visitUs: 'दुकान पर आएँ', hours: 'खुलने का समय',
            email: 'ईमेल', sendMsg: 'संदेश भेजें', yourMsg: 'आपका संदेश', contactSoon: 'संपर्क जानकारी जल्द जोड़ी जाएगी।',
            openMaps: 'मैप में खोलें', msgFail: 'संदेश पाने के लिए सेटिंग्स में फ़ोन या ईमेल जोड़ें।',
            adminLogin: 'एडमिन लॉगिन', password: 'पासवर्ड', login: 'लॉगिन करें', show: 'दिखाएँ', hide: 'छिपाएँ',
            wrongPw: 'गलत पासवर्ड', locked: 'बहुत ज़्यादा कोशिशें। {n} सेकंड रुकें।', welcomeAdmin: 'एडमिन के रूप में लॉगिन हुआ',
            loggedOut: 'लॉगआउट हो गया', adminHint: 'एडमिन क्षेत्र सिर्फ़ दुकान मालिक खोल सकते हैं।',
            reportTitle: 'रिपोर्ट', revenue: 'कुल बिक्री', orders: 'ऑर्डर', pending: 'लंबित', lowStock: 'कम स्टॉक',
            last7: 'पिछले 7 दिनों की बिक्री', byCat: 'श्रेणी के अनुसार बिक्री', recentOrders: 'हाल के ऑर्डर',
            noOrders: 'अभी कोई ऑर्डर नहीं। दुकान पर हुए ऑर्डर यहाँ दिखेंगे।', exportCsv: 'CSV डाउनलोड करें', status: 'स्थिति',
            sPending: 'लंबित', sConfirmed: 'पक्का', sDelivered: 'डिलीवर हुआ', sCancelled: 'रद्द',
            setup: 'सेटअप पूरा करें: सेटिंग्स में फ़ोन, WhatsApp और UPI ID जोड़ें।', openSettings: 'सेटिंग्स खोलें',
            paymentLbl: 'भुगतान', placedOn: 'ऑर्डर की तारीख़',
            manageTitle: 'उत्पाद प्रबंधन', addProduct: 'उत्पाद जोड़ें', editProduct: 'उत्पाद बदलें', price: 'कीमत',
            mrp: 'असली कीमत (वैकल्पिक)', stock: 'स्टॉक', edit: 'बदलें', delete: 'हटाएँ', confirmDelete: 'क्या यह उत्पाद हटाना है?',
            nameEn: 'नाम (अंग्रेज़ी)', nameHi: 'नाम (हिंदी, वैकल्पिक)', descEn: 'विवरण (अंग्रेज़ी)',
            descHi: 'विवरण (हिंदी, वैकल्पिक)', photos: 'फ़ोटो (4 तक)', addPhotos: 'फ़ोटो जोड़ें',
            featured: 'होम पेज पर दिखाएँ', save: 'सेव करें', cancel: 'रद्द करें', saved: 'सेव हो गया', deleted: 'हटा दिया',
            fillRequired: 'ज़रूरी जानकारी भरें।',
            saveFail: 'इस ब्राउज़र में सेव नहीं हो सका। स्टोरेज भर गया है — छोटी बैनर फ़ोटो रखें।',
            filterProducts: 'उत्पाद खोजें…', noProducts: 'अभी कोई उत्पाद नहीं। पहला उत्पाद जोड़ें।',
            customersTitle: 'ग्राहक', totalSpent: 'कुल खर्च', lastOrder: 'पिछला ऑर्डर',
            noCustomers: 'पहले ऑर्डर के बाद ग्राहक यहाँ दिखेंगे।', searchCust: 'नाम या फ़ोन खोजें…',
            shopDetails: 'दुकान की जानकारी', shopName: 'दुकान का नाम', payAndOffer: 'भुगतान और ऑफ़र', upiName: 'UPI खाते का नाम',
            bankText: 'बैंक विवरण (बैंक ट्रांसफ़र चुनने वाले ग्राहकों को दिखेगा)', offerOn: 'ऑफ़र चालू है',
            offerMin: 'न्यूनतम ऑर्डर राशि (₹)', offerPct: 'छूट प्रतिशत', catManage: 'श्रेणियाँ', addCat: 'श्रेणी जोड़ें',
            catInUse: 'इस श्रेणी में उत्पाद हैं। पहले उन्हें हटाएँ या बदलें।', picture: 'चित्र शैली',
            slides: 'होम पेज बैनर', addSlide: 'बैनर जोड़ें', editSlide: 'बैनर बदलें', slideTitle: 'शीर्षक (अंग्रेज़ी)',
            slideTitleHi: 'शीर्षक (हिंदी)', slideSub: 'छोटा टेक्स्ट (अंग्रेज़ी)', slideSubHi: 'छोटा टेक्स्ट (हिंदी)',
            bgColor: 'पीछे का रंग', opens: 'बटन कहाँ खुलेगा', allProducts: 'सभी उत्पाद', photo: 'फ़ोटो',
            useIllustration: 'फ़ोटो न हो तो यह चित्र दिखाएँ', changePw: 'पासवर्ड बदलें', curPw: 'मौजूदा पासवर्ड',
            newPw: 'नया पासवर्ड (कम से कम 6 अक्षर)', confPw: 'नया पासवर्ड दोबारा लिखें', pwChanged: 'पासवर्ड बदल गया',
            pwMismatch: 'पासवर्ड मेल नहीं खाते', pwShort: 'कम से कम 6 अक्षर रखें',
            defaultPwWarn: 'आप शुरुआती पासवर्ड इस्तेमाल कर रहे हैं। अभी बदलें।',
            backup: 'बैकअप और रीसेट', backupNote: 'सेटिंग्स, बैनर, ऑर्डर और ग्राहक सिर्फ़ इसी ब्राउज़र में सेव हैं। उत्पाद और श्रेणियाँ ऑनलाइन डेटाबेस में हैं। नियमित बैकअप डाउनलोड करें।',
            downloadBackup: 'बैकअप डाउनलोड करें', restoreBackup: 'बैकअप रीस्टोर करें', resetData: 'लोकल डेटा रीसेट करें',
            confirmReset: 'इस ब्राउज़र की सेटिंग्स, बैनर और ऑर्डर मिटाने हैं? उत्पाद डेटाबेस में सुरक्षित रहेंगे।', restored: 'बैकअप रीस्टोर हो गया',
            badFile: 'यह फ़ाइल सही बैकअप नहीं है।', aboutEn: 'हमारे बारे में (अंग्रेज़ी)', aboutHi: 'हमारे बारे में (हिंदी)',
            deleteSlide: 'क्या यह बैनर हटाना है?', stockShort: 'स्टॉक',

            loading: 'उत्पाद लोड हो रहे हैं…',
            catalogError: 'डेटाबेस से उत्पाद लोड नहीं हो सके',
            retry: 'फिर कोशिश करें',
            catalogEmpty: 'दुकान में अभी कोई उत्पाद नहीं है',
            catalogEmptyHint: 'कृपया थोड़ी देर बाद फिर देखें।',
            dbTitle: 'ऑनलाइन डेटाबेस',
            dbHelp: 'उत्पाद और श्रेणियाँ Supabase में सेव होती हैं। बदलाव सेव करने के लिए एडमिन खाते से साइन इन करें।',
            dbSignIn: 'डेटाबेस में साइन इन करें', dbSignOut: 'डेटाबेस से साइन आउट करें', dbEmail: 'एडमिन ईमेल',
            dbNotSignedIn: 'डेटाबेस में साइन इन नहीं हैं। बदलाव सेव नहीं हो सकते।',
            dbSignedInAs: '{email} के रूप में साइन इन',
            dbSignInFail: 'साइन इन नहीं हुआ। ईमेल और पासवर्ड जाँचें।',
            dbSignedIn: 'डेटाबेस में साइन इन हो गया', dbSignedOut: 'डेटाबेस से साइन आउट हो गए',
            errRls: 'डेटाबेस ने यह बदलाव स्वीकार नहीं किया। जाँचें कि आप एडमिन के रूप में साइन इन हैं और Row Level Security नीतियाँ इसकी अनुमति देती हैं।',
            errFk: 'यह आइटम दूसरे रिकॉर्ड (जैसे ऑर्डर) से जुड़ा है, इसलिए हटाया नहीं जा सकता।',
            errDup: 'यही यूनिक वैल्यू वाला आइटम पहले से मौजूद है।',
            errNetwork: 'नेटवर्क की समस्या। इंटरनेट जाँचकर फिर कोशिश करें।',
            errExpired: 'आपका डेटाबेस सेशन खत्म हो गया। फिर से साइन इन करें।',
            errGeneric: 'कुछ गड़बड़ हो गई।',
            errBadData: 'डेटाबेस ने यह जानकारी स्वीकार नहीं की',
            saving: 'सेव हो रहा है…',
            imageUrl: 'फ़ोटो का लिंक (डेटाबेस में सेव होगा)',
            imageUrlHint: 'https:// से शुरू होने वाला लिंक चिपकाएँ',
            imageUrlBad: 'फ़ोटो का लिंक http:// या https:// से शुरू होना चाहिए',
            devicePhotos: 'इस डिवाइस की फ़ोटो (सिर्फ़ प्रीव्यू, सेव नहीं होंगी)',
            photosNotSaved: 'सेव हो गया। डिवाइस की फ़ोटो सेव नहीं हुईं — तस्वीर दिखाने के लिए फ़ोटो का लिंक डालें।',
            visibleInShop: 'दुकान में दिखे', hidden: 'छिपा हुआ',
            confirmDeactivate: 'यह उत्पाद दूसरे रिकॉर्ड से जुड़ा है, इसलिए हटाया नहीं जा सकता। इसे दुकान से छिपा दें?',
            deactivated: 'उत्पाद दुकान से छिपा दिया गया',
            priceInvalid: '0 से ज़्यादा कीमत लिखें (1,00,00,000 तक)।',
            stockInvalid: 'स्टॉक 0 से 100000 के बीच पूरी संख्या होनी चाहिए।',
            mrpInvalid: 'असली कीमत, कीमत से कम नहीं हो सकती।',
            nameExists: 'इसी नाम का उत्पाद पहले से है। फिर भी जोड़ें?',
            noCategory: 'कोई श्रेणी नहीं',
            catHiNote: 'श्रेणियों के हिंदी नाम के लिए categories टेबल में name_hi कॉलम चाहिए।',
            stockHint: 'ऑर्डर पक्का करने पर डेटाबेस में स्टॉक घटता है, और रद्द करने पर वापस जुड़ता है।',
            orderStockFail: 'स्टॉक अपडेट नहीं हो सका, इसलिए ऑर्डर की स्थिति नहीं बदली गई।',
            cartUpdated: 'आपके कार्ट के कुछ सामान अब उपलब्ध नहीं हैं, इसलिए हटा दिए गए।'
        }
    };
    var lang = (function () {
        try { var l = localStorage.getItem(LS.lang); if (l === 'hi' || l === 'en') return l; } catch (e) { }
        return (navigator.language || '').toLowerCase().indexOf('hi') === 0 ? 'hi' : 'en';
    })();
    function t(k, v) {
        var s = (T[lang] && T[lang][k] != null) ? T[lang][k] : (T.en[k] != null ? T.en[k] : k);
        if (v) s = s.replace(/\{(\w+)\}/g, function (m, x) { return v[x] !== undefined ? v[x] : m; });
        return s;
    }
    function pick(en, hi) { return (lang === 'hi' && hi) ? hi : en; }

    /* ---------------------------------------------------------
       Furniture pictures (drawn in SVG, used when a product has no image)
    --------------------------------------------------------- */
    var ART_TYPES = ['sofa', 'bed', 'chair', 'table', 'dining', 'wardrobe', 'shelf'];
    var ART_LABEL = { sofa: 'Sofa', bed: 'Bed', chair: 'Chair', table: 'Table', dining: 'Dining set', wardrobe: 'Wardrobe', shelf: 'Shelf' };
    var PALETTE = ['#8A5A3B', '#B07A4F', '#3E5C76', '#6B7F5E', '#9C4A3C', '#5B4B8A', '#B88A3E', '#4F6D7A'];

    function hex2rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
    function rgb2hex(a) { return '#' + a.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); }).join(''); }
    function mix(a, b, k) { var x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map(function (v, i) { return v + (y[i] - v) * k; })); }
    function shade(c, k) { return mix(c, '#000000', k); }
    function tint(c, k) { return mix(c, '#ffffff', k); }

    function artSVG(type, c, bg) {
        var d = shade(c, 0.28), l = tint(c, 0.25), leg = '#3b2a1d', g = '';
        switch (type) {
            case 'bed':
                g = '<rect x="80" y="66" width="240" height="124" rx="12" fill="' + d + '"/>' +
                    '<rect x="60" y="172" width="280" height="58" rx="10" fill="' + c + '"/>' +
                    '<rect x="70" y="148" width="260" height="46" rx="10" fill="#f4efe8"/>' +
                    '<rect x="84" y="134" width="100" height="28" rx="13" fill="#ffffff"/>' +
                    '<rect x="216" y="134" width="100" height="28" rx="13" fill="#ffffff"/>' +
                    '<rect x="70" y="170" width="260" height="32" rx="8" fill="' + l + '"/>' +
                    '<rect x="68" y="228" width="14" height="24" rx="3" fill="' + leg + '"/>' +
                    '<rect x="318" y="228" width="14" height="24" rx="3" fill="' + leg + '"/>';
                break;
            case 'chair':
                g = '<rect x="150" y="58" width="100" height="116" rx="16" fill="' + c + '"/>' +
                    '<rect x="165" y="74" width="70" height="82" rx="9" fill="' + l + '"/>' +
                    '<rect x="132" y="166" width="136" height="28" rx="11" fill="' + d + '"/>' +
                    '<rect x="146" y="190" width="12" height="62" rx="3" fill="' + leg + '"/>' +
                    '<rect x="242" y="190" width="12" height="62" rx="3" fill="' + leg + '"/>';
                break;
            case 'table':
                g = '<rect x="70" y="138" width="260" height="22" rx="8" fill="' + c + '"/>' +
                    '<rect x="76" y="156" width="248" height="9" rx="4" fill="' + d + '"/>' +
                    '<rect x="92" y="162" width="14" height="90" rx="3" fill="' + leg + '"/>' +
                    '<rect x="294" y="162" width="14" height="90" rx="3" fill="' + leg + '"/>' +
                    '<rect x="106" y="206" width="188" height="8" rx="3" fill="' + d + '"/>';
                break;
            case 'dining':
                g = '<rect x="46" y="108" width="16" height="84" rx="7" fill="' + d + '"/>' +
                    '<rect x="46" y="188" width="62" height="14" rx="6" fill="' + d + '"/>' +
                    '<rect x="52" y="200" width="9" height="52" rx="3" fill="' + leg + '"/>' +
                    '<rect x="338" y="108" width="16" height="84" rx="7" fill="' + d + '"/>' +
                    '<rect x="292" y="188" width="62" height="14" rx="6" fill="' + d + '"/>' +
                    '<rect x="339" y="200" width="9" height="52" rx="3" fill="' + leg + '"/>' +
                    '<rect x="96" y="134" width="208" height="20" rx="8" fill="' + c + '"/>' +
                    '<rect x="104" y="152" width="192" height="8" rx="3" fill="' + d + '"/>' +
                    '<rect x="112" y="158" width="14" height="94" rx="3" fill="' + leg + '"/>' +
                    '<rect x="274" y="158" width="14" height="94" rx="3" fill="' + leg + '"/>';
                break;
            case 'wardrobe':
                g = '<rect x="104" y="44" width="192" height="206" rx="8" fill="' + c + '"/>' +
                    '<rect x="114" y="54" width="82" height="186" rx="5" fill="' + l + '" opacity=".55"/>' +
                    '<rect x="204" y="54" width="82" height="186" rx="5" fill="' + l + '" opacity=".55"/>' +
                    '<rect x="186" y="128" width="5" height="36" rx="2" fill="' + d + '"/>' +
                    '<rect x="209" y="128" width="5" height="36" rx="2" fill="' + d + '"/>' +
                    '<rect x="104" y="238" width="192" height="12" fill="' + d + '"/>' +
                    '<rect x="114" y="250" width="14" height="6" fill="' + leg + '"/>' +
                    '<rect x="272" y="250" width="14" height="6" fill="' + leg + '"/>';
                break;
            case 'shelf':
                g = '<rect x="114" y="46" width="172" height="206" rx="6" fill="' + c + '"/>' +
                    '<rect x="124" y="56" width="152" height="186" fill="' + tint(c, 0.6) + '"/>' +
                    '<rect x="124" y="112" width="152" height="8" fill="' + d + '"/>' +
                    '<rect x="124" y="172" width="152" height="8" fill="' + d + '"/>' +
                    '<rect x="132" y="82" width="14" height="30" fill="#B3362B"/><rect x="148" y="76" width="12" height="36" fill="#1E2A4A"/>' +
                    '<rect x="162" y="86" width="16" height="26" fill="#E8A317"/><rect x="230" y="84" width="30" height="28" rx="4" fill="#6B7F5E"/>' +
                    '<rect x="136" y="144" width="40" height="28" rx="4" fill="#5B4B8A"/><rect x="198" y="136" width="14" height="36" fill="#B3362B"/>' +
                    '<rect x="214" y="146" width="14" height="26" fill="#1E2A4A"/>' +
                    '<rect x="146" y="206" width="70" height="36" rx="4" fill="' + d + '" opacity=".5"/>';
                break;
            default: /* sofa */
                g = '<rect x="70" y="108" width="260" height="98" rx="22" fill="' + c + '"/>' +
                    '<rect x="46" y="148" width="64" height="88" rx="19" fill="' + d + '"/>' +
                    '<rect x="290" y="148" width="64" height="88" rx="19" fill="' + d + '"/>' +
                    '<rect x="100" y="158" width="100" height="58" rx="12" fill="' + l + '"/>' +
                    '<rect x="200" y="158" width="100" height="58" rx="12" fill="' + l + '"/>' +
                    '<rect x="62" y="232" width="12" height="20" rx="3" fill="' + leg + '"/>' +
                    '<rect x="326" y="232" width="12" height="20" rx="3" fill="' + leg + '"/>';
        }
        var back = bg
            ? '<rect width="400" height="300" fill="' + tint(c, 0.86) + '"/><rect y="252" width="400" height="48" fill="' + tint(c, 0.76) + '"/>'
            : '';
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' + back +
            '<ellipse cx="200" cy="256" rx="165" ry="9" fill="rgba(0,0,0,' + (bg ? '.12' : '.28') + ')"/>' + g + '</svg>';
    }
    var artCache = {};
    function artURI(type, color, bg) {
        var k = type + color + bg;
        if (!artCache[k]) artCache[k] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(artSVG(type, color, bg !== false));
        return artCache[k];
    }
    function colorFor(id) {
        var h = 0, s = String(id);
        for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        return PALETTE[h % PALETTE.length];
    }
    /* Picks a drawing for a category from its name/slug when the "art" column is empty. */
    function guessArt(text) {
        var s = String(text || '').toLowerCase();
        if (/sofa|couch/.test(s)) return 'sofa';
        if (/bed|mattress|palang/.test(s)) return 'bed';
        if (/almirah|wardrobe|cupboard/.test(s)) return 'wardrobe';
        if (/dining/.test(s)) return 'dining';
        if (/chair|stool/.test(s)) return 'chair';
        if (/table|desk/.test(s)) return 'table';
        return 'shelf';
    }
    /* Hindi names for common categories. Used only when the categories table has no Hindi column. */
    var CAT_HI = {
        'sofas': 'सोफ़ा', 'sofa': 'सोफ़ा', 'beds': 'बेड', 'bed': 'बेड', 'almirahs': 'अलमारी', 'almirah': 'अलमारी',
        'wardrobe': 'अलमारी', 'wardrobes': 'अलमारी', 'chairs': 'कुर्सी', 'chair': 'कुर्सी', 'tables': 'टेबल', 'table': 'टेबल',
        'dining sets': 'डाइनिंग सेट', 'dining set': 'डाइनिंग सेट', 'mattresses': 'गद्दे', 'mattress': 'गद्दे',
        'other furniture': 'अन्य फ़र्नीचर', 'shelves': 'शेल्फ़'
    };

    /* ---------------------------------------------------------
       Local data (settings, banners, orders). The catalogue is NOT stored here.
    --------------------------------------------------------- */
    function sampleData() {
        /* Products and categories come only from Supabase, so they start empty here. */
        var slides = [
            {
                id: 's1', title: 'Quality furniture at the lowest prices', hi: 'सबसे कम कीमत पर बेहतरीन फ़र्नीचर उपलब्ध',
                sub: 'Beds, sofas, wardrobes, dining sets and more.', subHi: 'बेड, सोफ़ा, अलमारी, डाइनिंग सेट और बहुत कुछ।',
                bg: '#1E2A4A', art: 'sofa', artColor: '#D9A66B', img: '', cat: ''
            },
            {
                id: 's2', title: '{pct}% off on orders of {min} and above', hi: '{min} और उससे ऊपर की खरीद पर {pct}% की छूट',
                sub: 'The discount is applied automatically in your cart.', subHi: 'छूट कार्ट में अपने आप लग जाती है।',
                bg: '#5A3822', art: 'bed', artColor: '#E2B27A', img: '', cat: 'bed'
            },
            {
                id: 's3', title: 'A sofa set for every living room', hi: 'हर बैठक के लिए सोफ़ा सेट',
                sub: 'Two seaters, three seaters and corner sofas.', subHi: '2 सीटर, 3 सीटर और कॉर्नर सोफ़ा।',
                bg: '#24493A', art: 'sofa', artColor: '#C9B27A', img: '', cat: 'sofa'
            },
            {
                id: 's4', title: 'Order on WhatsApp, pay your way', hi: 'WhatsApp पर ऑर्डर करें, अपने तरीके से भुगतान करें',
                sub: 'UPI, cash on delivery or bank transfer.', subHi: 'UPI, कैश ऑन डिलीवरी या बैंक ट्रांसफ़र।',
                bg: '#3F2A5E', art: 'dining', artColor: '#D6A86A', img: '', cat: 'dining'
            }
        ];
        return {
            v: 1, seq: 1000,
            settings: {
                shopName: 'Shree Sawaliya Furniture', phone: '', whatsapp: '', email: '', address: '', hours: '',
                upi: '', upiName: 'Shree Sawaliya Furniture', bank: '',
                offerOn: true, offerMin: 50000, offerPct: 20,
                about: 'Shree Sawaliya Furniture sells beds, sofas, wardrobes, dining sets, tables and chairs.\nBrowse the collection here, send your order, and the shop will confirm it with you.',
                aboutHi: 'श्री सावलिया फ़र्नीचर में बेड, सोफ़ा, अलमारी, डाइनिंग सेट, टेबल और कुर्सियाँ मिलती हैं।\nयहाँ पूरा कलेक्शन देखें, अपना ऑर्डर भेजें, और दुकान आपसे ऑर्डर की पुष्टि करेगी।',
                pw: hashPw(DEFAULT_PASSWORD)
            },
            categories: [], products: [], slides: slides, orders: []
        };
    }

    var db = loadDB();
    function loadDB() {
        try {
            var raw = localStorage.getItem(LS.data);
            if (raw) {
                var d = JSON.parse(raw);
                if (d && d.v === 1 && d.settings) {
                    /* Anything saved by older versions (sample or local products) is ignored on purpose. */
                    d.products = []; d.categories = [];
                    if (!Array.isArray(d.slides)) d.slides = sampleData().slides;
                    if (!Array.isArray(d.orders)) d.orders = [];
                    return d;
                }
            }
        } catch (e) { }
        return sampleData();
    }
    /* What is saved in this browser: everything except the catalogue. */
    function localSnapshot() {
        return Object.assign({}, db, { products: [], categories: [] });
    }
    function save(quiet) {
        try { localStorage.setItem(LS.data, JSON.stringify(localSnapshot())); return true; }
        catch (e) { if (!quiet) toast(t('saveFail'), 'err'); return false; }
    }
    var cart = (function () {
        try { var c = JSON.parse(localStorage.getItem(LS.cart) || '[]'); return Array.isArray(c) ? c : []; } catch (e) { return []; }
    })();
    function saveCart() { try { localStorage.setItem(LS.cart, JSON.stringify(cart)); } catch (e) { } }

    /* ---------------------------------------------------------
       Catalogue state + helpers
    --------------------------------------------------------- */
    var catalog = { status: 'loading', error: '', catHi: false };   // status: loading | ok | error
    var catalogReq = 0;
    var dbSession = null;       // Supabase Auth session (admin), or null
    var dbLoginCb = null;
    var busy = {};              // prevents double submits
    var cartAdjusted = false;

    function S() { return db.settings; }
    function getP(id) {
        var k = normPid(id);
        for (var i = 0; i < db.products.length; i++) if (db.products[i].id === k) return db.products[i];
        return null;
    }
    /* Finds a category by its id, or by its slug (old links like #/products?cat=sofa still work). */
    function getCat(id) {
        if (id == null || id === '') return null;
        var s = String(id), i, k;
        for (i = 0; i < db.categories.length; i++) if (db.categories[i].id === s) return db.categories[i];
        for (i = 0; i < db.categories.length; i++) if (db.categories[i].slug && db.categories[i].slug === s) return db.categories[i];
        k = slugKey(s);
        if (k) for (i = 0; i < db.categories.length; i++) if (slugKey(db.categories[i].slug) === k) return db.categories[i];
        return null;
    }
    function shopProducts() { return db.products.filter(function (p) { return p.active !== false; }); }
    function shopCats() { return db.categories.filter(function (c) { return c.active !== false; }); }
    function pName(p) { return pick(p.name, p.hi); }
    function pDesc(p) { return pick(p.desc || '', p.descHi); }
    function cName(c) { return c ? pick(c.name, c.hi) : ''; }
    function artFor(p) {
        var c = getCat(p.cat);
        return artURI((p.art || (c && c.art) || 'sofa'), colorFor(p.id), true);
    }
    function pImgs(p) {
        if (p.imgs && p.imgs.length) return p.imgs;
        return [artFor(p)];
    }
    function discPct(p) { return p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0; }
    function offerStr() { return t('offerText', { pct: S().offerPct, min: inr(S().offerMin) }); }
    function tok(s) { return String(s || '').replace(/\{pct\}/g, S().offerPct).replace(/\{min\}/g, inr(S().offerMin)); }
    function waDigits() {
        var d = String(S().whatsapp || S().phone || '').replace(/\D/g, '');
        if (d.length === 10) d = '91' + d;
        return d;
    }
    function waLink(msg) { var d = waDigits(); return d ? 'https://wa.me/' + d + '?text=' + encodeURIComponent(msg) : ''; }
    function telLink() { var p = String(S().phone || S().whatsapp || '').replace(/[^\d+]/g, ''); return p ? 'tel:' + p : ''; }

    /* Database row  ->  the shape the rest of the shop already uses. */
    function mapCategory(c) {
        var nm = String(c.name || '');
        var art = ART_TYPES.indexOf(c.art) >= 0 ? c.art : guessArt((c.slug || '') + ' ' + nm);
        return {
            id: String(c.id), dbId: c.id, name: nm, slug: c.slug || '',
            hi: c.name_hi || CAT_HI[nm.trim().toLowerCase()] || '',
            art: art, img: c.image_url || '', active: c.is_active !== false
        };
    }
    function mapProduct(p) {
        var url = p.image_url ? String(p.image_url) : '';
        return {
            id: String(p.id), dbId: p.id, slug: p.slug || '',
            name: p.name || '', hi: p.name_hi || '',
            cat: p.category_id == null ? '' : String(p.category_id),
            price: Number(p.price) || 0, mrp: Number(p.mrp) || 0,
            stock: Math.max(0, parseInt(p.stock_quantity, 10) || 0),
            desc: p.description || '', descHi: p.description_hi || '',
            imgUrl: url, imgs: url ? [url] : [],
            featured: !!p.featured, active: p.is_active !== false
        };
    }
    function replaceProduct(row) {
        var m = (row && row.dbId !== undefined && row.id !== undefined && typeof row.id === 'string') ? row : mapProduct(row);
        for (var i = 0; i < db.products.length; i++) {
            if (db.products[i].id === m.id) { db.products[i] = m; return m; }
        }
        db.products.unshift(m);
        return m;
    }
    function replaceCategory(row) {
        var m = mapCategory(row);
        for (var i = 0; i < db.categories.length; i++) {
            if (db.categories[i].id === m.id) { db.categories[i] = m; return m; }
        }
        db.categories.push(m);
        db.categories.sort(function (a, b) { return a.name.localeCompare(b.name); });
        return m;
    }

    /* Turns a Supabase / network error into a plain message. */
    function dbErrorMessage(err) {
        var code = err && err.code, msg = String((err && err.message) || err || '');
        if (code === 'NO_ROWS' || code === '42501' || /row-level security|permission denied/i.test(msg)) return t('errRls');
        if (code === '23503') return t('errFk');
        if (code === '23505') return t('errDup');
        if (code === '23502' || code === '23514' || code === '22P02' || code === '22003') return t('errBadData') + ' (' + msg + ')';
        if (/jwt/i.test(msg) && /expired|invalid/i.test(msg)) return t('errExpired');
        if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) return t('errNetwork');
        return msg || t('errGeneric');
    }
    /* Supabase returns no error when Row Level Security hides every row; this makes that visible. */
    function noRowsError() { var e = new Error('No rows changed'); e.code = 'NO_ROWS'; return e; }

    /* Loads categories and products from Supabase. Never throws. Returns true on success.
       Without an admin session only active rows are requested; with one, hidden rows are loaded too. */
    async function loadSupabaseCatalog() {
        var token = ++catalogReq;
        catalog.status = 'loading'; catalog.error = '';
        if (!furnitureDB) {
            catalog.status = 'error';
            catalog.error = 'The Supabase library did not load. Check the <script> tag in index.html.';
            db.categories = []; db.products = [];
            return false;
        }
        try {
            var cq = furnitureDB.from('categories').select('*').order('name');
            var pq = furnitureDB.from('products').select('*').order('created_at', { ascending: false });
            if (!dbSession) { cq = cq.eq('is_active', true); pq = pq.eq('is_active', true); }
            var res = await Promise.all([cq, pq]);
            if (token !== catalogReq) return false;          // a newer load replaced this one
            if (res[0].error) throw res[0].error;
            if (res[1].error) throw res[1].error;
            var catRows = res[0].data || [], prodRows = res[1].data || [];
            db.categories = catRows.map(mapCategory);
            db.products = prodRows.map(mapProduct);
            catalog.catHi = catRows.length > 0 && Object.prototype.hasOwnProperty.call(catRows[0], 'name_hi');
            catalog.status = 'ok';
            pruneCart();
            return true;
        } catch (err) {
            if (token !== catalogReq) return false;
            console.error('Could not load the Supabase catalogue:', err);
            db.categories = []; db.products = [];
            catalog.status = 'error';
            catalog.error = dbErrorMessage(err);
            return false;
        }
    }

    /* Removes cart lines whose product is gone, hidden or out of stock; migrates old "sb-12" ids. */
    function pruneCart() {
        var merged = {}, order = [], before = JSON.stringify(cart);
        cart.forEach(function (c) {
            var k = normPid(c.id), p = getP(k);
            if (!p || p.active === false || p.stock <= 0) return;
            var q = Math.max(1, parseInt(c.qty, 10) || 1);
            if (merged[k]) merged[k] += q; else { merged[k] = q; order.push(k); }
        });
        cart = order.map(function (k) { return { id: k, qty: Math.min(merged[k], getP(k).stock) }; });
        if (JSON.stringify(cart) !== before) {
            cartAdjusted = cartAdjusted || before !== '[]';
            saveCart();
        }
    }

    /* ---------------------------------------------------------
       Admin session
    --------------------------------------------------------- */
    function isAdmin() { try { return sessionStorage.getItem('ssf_admin') === '1'; } catch (e) { return window.__adm === true; } }
    function setAdmin(v) {
        try { if (v) sessionStorage.setItem('ssf_admin', '1'); else sessionStorage.removeItem('ssf_admin'); } catch (e) { window.__adm = !!v; }
        document.body.classList.toggle('is-admin', !!v);
    }

    /* Supabase Auth session (this is what lets the admin write to the database). */
    async function refreshSession() {
        if (!furnitureDB) { dbSession = null; return; }
        try {
            var r = await furnitureDB.auth.getSession();
            dbSession = (r && r.data && r.data.session) || null;
        } catch (e) { dbSession = null; }
    }
    /* Call before any database write. Returns true only if an Auth session exists.
       opts.inline: show the problem inside the open form instead of opening a sign-in window.
       opts.then:   run after the admin signs in. */
    async function requireDb(opts) {
        opts = opts || {};
        if (!furnitureDB) { toast(t('catalogError'), 'err'); return false; }
        await refreshSession();
        if (dbSession) return true;
        if (opts.inline) {
            var fe = $('#formErr'); if (fe) fe.textContent = t('dbNotSignedIn');
            toast(t('dbNotSignedIn'), 'err');
        } else {
            toast(t('dbNotSignedIn'), 'err');
            openDbLogin(opts.then);
        }
        return false;
    }
    function setBusy(btn, on) {
        if (!btn) return;
        btn.disabled = !!on;
        if (on) { btn.dataset.txt = btn.textContent; btn.textContent = t('saving'); }
        else if (btn.dataset.txt) { btn.textContent = btn.dataset.txt; delete btn.dataset.txt; }
    }

    /* ---------------------------------------------------------
       Toast, modal, drawers
    --------------------------------------------------------- */
    var toastTimer;
    function toast(msg, kind) {
        var el = $('#toast');
        el.textContent = msg;
        el.className = 'toast on' + (kind === 'err' ? ' err' : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove('on'); }, kind === 'err' ? 5200 : 2600);
    }
    var lastFocus = null;
    function syncLock() {
        var modalOn = $('#modal').classList.contains('open');
        var cartOn = $('#cartDrawer').classList.contains('open');
        var menuOn = $('#sidebar').classList.contains('open') && window.innerWidth < 900;
        document.body.classList.toggle('lock', modalOn || cartOn || menuOn);
        $('#scrim').classList.toggle('on', cartOn || menuOn);
    }
    function openModal(html, wide) {
        closeDrawers();
        var m = $('#modal'), s = $('#sheet');
        if (!m.classList.contains('open')) lastFocus = document.activeElement;
        s.className = 'sheet' + (wide ? ' wide' : '');
        s.innerHTML = html;
        m.classList.add('open');
        m.setAttribute('aria-hidden', 'false');
        s.scrollTop = 0;
        syncLock();
        setTimeout(function () { var f = $('input:not([type=hidden]):not([type=file]),textarea', s); if (f && window.innerWidth >= 900) f.focus(); else s.focus(); }, 30);
    }
    function closeModal() {
        var m = $('#modal');
        if (!m.classList.contains('open')) return;
        m.classList.remove('open');
        m.setAttribute('aria-hidden', 'true');
        $('#sheet').innerHTML = '';
        syncLock();
        if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { } }
    }
    function openMenu() {
        $('#sidebar').classList.add('open');
        $('#menuBtn').setAttribute('aria-expanded', 'true');
        syncLock();
    }
    function closeMenu() {
        $('#sidebar').classList.remove('open');
        $('#menuBtn').setAttribute('aria-expanded', 'false');
        syncLock();
    }
    function openCart() {
        closeMenu();
        renderCart();
        var d = $('#cartDrawer');
        d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
        syncLock();
    }
    function closeCart() {
        var d = $('#cartDrawer');
        d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
        syncLock();
    }
    function closeDrawers() { closeMenu(); closeCart(); }
    function closeAll() { closeDrawers(); closeModal(); }

    /* ---------------------------------------------------------
       Product card + detail
    --------------------------------------------------------- */
    function priceHTML(p) {
        var off = discPct(p);
        return '<div class="price"><b>' + inr(p.price) + '</b>' +
            (off ? '<s>' + inr(p.mrp) + '</s><span class="off">' + t('off', { n: off }) + '</span>' : '') + '</div>';
    }
    /* If a product's image link is broken, data-fb holds the drawing to show instead. */
    function fbAttr(p) { return p.imgs && p.imgs.length ? ' data-fb="' + esc(artFor(p)) + '"' : ''; }
    function cardHTML(p) {
        var c = getCat(p.cat), off = discPct(p), out = p.stock <= 0;
        return '<article class="pcard">' +
            '<button type="button" class="pimg" data-act="view" data-id="' + esc(p.id) + '" aria-label="' + esc(t('viewDetails') + ': ' + pName(p)) + '">' +
            '<img src="' + esc(pImgs(p)[0]) + '"' + fbAttr(p) + ' alt="' + esc(pName(p)) + '" loading="lazy" decoding="async">' +
            (out ? '<span class="badge out">' + t('outOfStock') + '</span>' : (off ? '<span class="badge">' + t('off', { n: off }) + '</span>' : '')) +
            '</button>' +
            '<div class="pbody"><span class="pcat">' + esc(cName(c)) + '</span>' +
            '<h3 class="pname">' + esc(pName(p)) + '</h3>' + priceHTML(p) +
            '<div class="pbtns"><button type="button" class="btn ghost" data-act="view" data-id="' + esc(p.id) + '">' + t('viewDetails') + '</button>' +
            '<button type="button" class="btn primary add" data-act="add" data-id="' + esc(p.id) + '" aria-label="' + esc(t('addToCart')) + '"' + (out ? ' disabled' : '') + '>' + icon('cart') + '</button></div>' +
            '</div></article>';
    }

    var detail = { id: '', imgs: [], qty: 1 };
    function openDetail(id) {
        var p = getP(id); if (!p || p.active === false) return;
        detail = { id: p.id, imgs: pImgs(p), qty: 1 };
        var c = getCat(p.cat), out = p.stock <= 0;
        var stockHTML = out ? '<span class="stock out">' + t('outOfStock') + '</span>'
            : (p.stock <= 3 ? '<span class="stock low">' + t('onlyLeft', { n: p.stock }) + '</span>' : '<span class="stock">' + t('inStock') + '</span>');
        var wa = waLink('Hello, I want to know more about: ' + p.name + ' (' + inr(p.price) + ')');
        openModal(
            '<div class="mhead"><h2>' + esc(cName(c)) + '</h2><button type="button" class="icon-btn dark" data-act="closeModal" aria-label="' + esc(t('close')) + '">' + icon('close') + '</button></div>' +
            '<div class="mbody"><div class="detail"><div class="gallery"><img class="main" id="dMain" src="' + esc(detail.imgs[0]) + '"' + fbAttr(p) + ' alt="' + esc(pName(p)) + '">' +
            (detail.imgs.length > 1 ? '<div class="thumbs">' + detail.imgs.map(function (s, i) {
                return '<button type="button" class="' + (i === 0 ? 'on' : '') + '" data-act="thumb" data-id="' + i + '" aria-label="' + (i + 1) + '"><img src="' + esc(s) + '" alt=""></button>';
            }).join('') + '</div>' : '') + '</div>' +
            '<div style="display:grid;gap:10px"><h2>' + esc(pName(p)) + '</h2>' + priceHTML(p) + '<div>' + stockHTML + '</div>' +
            (pDesc(p) ? '<div><b>' + t('description') + '</b><p class="desc">' + esc(pDesc(p)) + '</p></div>' : '') +
            (out ? '' : '<div class="field" style="margin:4px 0 0"><span class="lbl">' + t('qty') + '</span><div class="qty" style="justify-self:start"><button type="button" data-act="dq" data-id="-1" aria-label="-">−</button><output id="dQty">1</output><button type="button" data-act="dq" data-id="1" aria-label="+">+</button></div></div>') +
            '</div></div></div>' +
            '<div class="mfoot"><div class="foot-row">' +
            '<button type="button" class="btn ghost" data-act="dAdd"' + (out ? ' disabled' : '') + '>' + icon('cart') + t('addToCart') + '</button>' +
            '<button type="button" class="btn primary" data-act="dBuy"' + (out ? ' disabled' : '') + '>' + t('buyNow') + '</button></div>' +
            (wa ? '<a class="btn wa block" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icon('chat') + t('askWa') + '</a>' : '') +
            '</div>', true);
    }

    /* ---------------------------------------------------------
       Cart
    --------------------------------------------------------- */
    function cartLines() {
        return cart.map(function (c) { return { p: getP(c.id), qty: c.qty }; }).filter(function (l) { return l.p && l.p.active !== false; });
    }
    function totals() {
        var lines = cartLines();
        var subtotal = lines.reduce(function (s, l) { return s + l.p.price * l.qty; }, 0);
        var s = S();
        var discount = (s.offerOn && subtotal > 0 && subtotal >= s.offerMin) ? Math.round(subtotal * s.offerPct / 100) : 0;
        return { lines: lines, subtotal: subtotal, discount: discount, total: subtotal - discount };
    }
    function addToCart(id, qty, quiet) {
        var p = getP(id); if (!p || p.active === false) return false;
        qty = qty || 1;
        if (p.stock <= 0) { toast(t('outOfStock'), 'err'); return false; }
        var line = null; cart.forEach(function (c) { if (c.id === p.id) line = c; });
        var cur = line ? line.qty : 0;
        if (cur + qty > p.stock) { toast(t('onlyLeft', { n: p.stock }), 'err'); return false; }
        if (line) line.qty += qty; else cart.push({ id: p.id, qty: qty });
        saveCart(); renderCart();
        if (!quiet) toast(t('added'));
        return true;
    }
    function renderCart() {
        var tt = totals(), lines = tt.lines, s = S();
        var n = lines.reduce(function (a, l) { return a + l.qty; }, 0);
        $$('.cart-count').forEach(function (b) { b.textContent = n; b.hidden = n === 0; });
        var body, foot = '';
        if (!lines.length) {
            body = '<div class="empty"><h3>' + t('cartEmpty') + '</h3><p>' + t('cartEmptyHint') + '</p><a class="btn primary" href="#/products" data-act="closeAll">' + t('shopNow') + '</a></div>';
        } else {
            var bar = '';
            if (s.offerOn) {
                if (tt.discount) bar = '<div class="offer-bar won">' + icon('check') + ' ' + t('offerWon', { pct: s.offerPct }) + '</div>';
                else bar = '<div class="offer-bar"><span>' + t('addMore', { amt: inr(s.offerMin - tt.subtotal), pct: s.offerPct }) + '</span><div class="meter"><i style="width:' + Math.min(100, Math.round(tt.subtotal / s.offerMin * 100)) + '%"></i></div></div>';
            }
            body = bar + lines.map(function (l) {
                return '<div class="line"><img src="' + esc(pImgs(l.p)[0]) + '"' + fbAttr(l.p) + ' alt=""><div><b>' + esc(pName(l.p)) + '</b><span class="lp">' + inr(l.p.price) + '</span>' +
                    '<div class="row"><div class="qty"><button type="button" data-act="cq" data-id="' + esc(l.p.id) + '" data-d="-1" aria-label="-">−</button><output>' + l.qty + '</output><button type="button" data-act="cq" data-id="' + esc(l.p.id) + '" data-d="1" aria-label="+">+</button></div>' +
                    '<button type="button" class="link-btn" data-act="crm" data-id="' + esc(l.p.id) + '">' + t('remove') + '</button></div></div></div>';
            }).join('');
            foot = '<div class="mfoot"><div class="sum"><div><span>' + t('subtotal') + '</span><span>' + inr(tt.subtotal) + '</span></div>' +
                (tt.discount ? '<div class="disc"><span>' + t('discount') + ' (' + s.offerPct + '%)</span><span>−' + inr(tt.discount) + '</span></div>' : '') +
                '<div class="total"><span>' + t('total') + '</span><span>' + inr(tt.total) + '</span></div></div>' +
                '<button type="button" class="btn gold block" data-act="checkout">' + t('checkout') + '</button></div>';
        }
        $('#cartDrawer').innerHTML = '<div class="mhead"><h2>' + t('yourCart') + '</h2><button type="button" class="icon-btn dark" data-act="closeCart" aria-label="' + esc(t('close')) + '">' + icon('close') + '</button></div><div class="mbody">' + body + '</div>' + foot;
    }

    /* ---------------------------------------------------------
       Checkout
    --------------------------------------------------------- */
    function openCheckout() {
        var tt = totals(); if (!tt.lines.length) return;
        var pays = [['upi', 'pUpi', 'pUpiD'], ['cod', 'pCod', 'pCodD'], ['bank', 'pBank', 'pBankD'], ['card', 'pCard', 'pCardD']];
        openModal('<form class="mform" data-form="order" novalidate>' +
            '<div class="mhead"><h2>' + t('checkout') + '</h2><button type="button" class="icon-btn dark" data-act="closeModal" aria-label="' + esc(t('close')) + '">' + icon('close') + '</button></div>' +
            '<div class="mbody">' +
            '<div class="field"><label for="o-name">' + t('name') + '</label><input id="o-name" name="name" autocomplete="name" required><div class="err" data-err="name"></div></div>' +
            '<div class="field"><label for="o-phone">' + t('phone') + '</label><input id="o-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="14" required><div class="err" data-err="phone"></div></div>' +
            '<div class="field"><label for="o-addr">' + t('address') + '</label><textarea id="o-addr" name="address" autocomplete="street-address" required></textarea><div class="err" data-err="address"></div></div>' +
            '<div class="field"><label for="o-note">' + t('note') + '</label><input id="o-note" name="note"></div>' +
            '<span class="lbl" style="font-weight:600;display:block;margin-bottom:8px">' + t('payment') + '</span><div class="pay-list">' +
            pays.map(function (p, i) {
                return '<label class="pay"><input type="radio" name="pay" value="' + p[0] + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + t(p[1]) + '</b><span>' + t(p[2]) + '</span></span></label>';
            }).join('') + '</div>' +
            '<div class="sum"><div><span>' + t('subtotal') + '</span><span>' + inr(tt.subtotal) + '</span></div>' +
            (tt.discount ? '<div class="disc"><span>' + t('discount') + '</span><span>−' + inr(tt.discount) + '</span></div>' : '') +
            '<div class="total"><span>' + t('total') + '</span><span>' + inr(tt.total) + '</span></div></div>' +
            '</div><div class="mfoot"><button type="submit" class="btn gold block">' + t('placeOrder') + ' · ' + inr(tt.total) + '</button></div></form>');
    }
    var PAY_NAME = { upi: 'UPI', cod: 'Cash on delivery', bank: 'Bank transfer', card: 'Card / net banking (payment link)' };

    function orderMessage(o) {
        var m = 'New order ' + o.id + '\nName: ' + o.customer.name + '\nPhone: ' + o.customer.phone + '\nAddress: ' + o.customer.address + '\n\nItems:\n';
        o.items.forEach(function (i) { m += '- ' + i.name + ' x ' + i.qty + ' = ' + inr(i.price * i.qty) + '\n'; });
        if (o.discount) m += '\nOffer discount: -' + inr(o.discount);
        m += '\nTotal: ' + inr(o.total) + '\nPayment: ' + PAY_NAME[o.pay];
        if (o.customer.note) m += '\nNote: ' + o.customer.note;
        return m;
    }
    /* Checking out does NOT change database stock (visitors are not allowed to write to the database).
       Stock is reduced once, when the admin confirms the order (see setOrderStatus). */
    function placeOrder(f) {
        var fd = new FormData(f);
        var name = String(fd.get('name') || '').trim(), phone = String(fd.get('phone') || '').replace(/[^\d+]/g, ''),
            address = String(fd.get('address') || '').trim(), note = String(fd.get('note') || '').trim(), pay = String(fd.get('pay') || 'cod');
        var digits = phone.replace(/\D/g, '');
        var errs = { name: name ? '' : t('errName'), phone: (digits.length >= 10 && digits.length <= 13) ? '' : t('errPhone'), address: address.length >= 6 ? '' : t('errAddress') };
        var bad = false;
        Object.keys(errs).forEach(function (k) { var e = $('[data-err="' + k + '"]', f); if (e) e.textContent = errs[k]; if (errs[k]) bad = true; });
        if (bad) { var first = $('.err:not(:empty)', f); if (first && first.scrollIntoView) first.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); return; }
        var tt = totals(); if (!tt.lines.length) return;
        for (var i = 0; i < tt.lines.length; i++) {
            if (tt.lines[i].qty > tt.lines[i].p.stock) { toast(pName(tt.lines[i].p) + ': ' + t('onlyLeft', { n: tt.lines[i].p.stock }), 'err'); return; }
        }
        db.seq = (db.seq || 1000) + 1;
        var order = {
            id: 'SSF' + db.seq, date: new Date().toISOString(),
            customer: { name: name, phone: phone, address: address, note: note },
            items: tt.lines.map(function (l) { return { id: l.p.id, name: l.p.name, cat: l.p.cat, price: l.p.price, qty: l.qty }; }),
            subtotal: tt.subtotal, discount: tt.discount, total: tt.total, pay: pay, status: 'pending',
            stockDeducted: false
        };
        db.orders.unshift(order);
        save(true);
        cart = []; saveCart(); renderCart();
        showSuccess(order);
        render(true);
    }
    function showSuccess(o) {
        var s = S(), extra = '';
        if (o.pay === 'upi') {
            if (s.upi) {
                var link = 'upi://pay?pa=' + encodeURIComponent(s.upi) + '&pn=' + encodeURIComponent(s.upiName || s.shopName) + '&am=' + o.total + '&cu=INR&tn=' + encodeURIComponent('Order ' + o.id);
                extra = '<div class="box"><b>' + t('upiId') + '</b><div><code>' + esc(s.upi) + '</code> <button type="button" class="btn ghost sm" data-act="copy" data-id="' + esc(s.upi) + '">' + t('copy') + '</button></div>' +
                    '<a class="btn gold block" href="' + esc(link) + '">' + t('payUpiNow') + ' · ' + inr(o.total) + '</a></div>';
            } else extra = '<div class="box">' + t('payLater') + '</div>';
        } else if (o.pay === 'bank') {
            extra = s.bank ? '<div class="box"><b>' + t('bankDetails') + '</b><pre>' + esc(s.bank) + '</pre></div>' : '<div class="box">' + t('payLater') + '</div>';
        } else if (o.pay === 'cod') {
            extra = '<div class="box">' + t('codNote', { amt: inr(o.total) }) + '</div>';
        } else extra = '<div class="box">' + t('pCardD') + '.</div>';
        var wa = waLink(orderMessage(o));
        openModal('<div class="mhead"><h2>' + t('orderPlaced') + '</h2><button type="button" class="icon-btn dark" data-act="closeModal" aria-label="' + esc(t('close')) + '">' + icon('close') + '</button></div>' +
            '<div class="mbody"><div class="success"><div class="tick">' + icon('check') + '</div>' +
            '<h2>' + esc(t('thanks', { name: o.customer.name.split(' ')[0] })) + '</h2>' +
            '<p>' + t('orderNo') + ': <b>' + o.id + '</b> · ' + inr(o.total) + '</p>' + extra + '</div></div>' +
            '<div class="mfoot">' + (wa ? '<a class="btn wa block" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icon('chat') + t('sendWa') + '</a>' : '') +
            '<a class="btn ghost block" href="#/products" data-act="closeModal">' + t('continueShop') + '</a></div>');
    }

    /* ---------------------------------------------------------
       Router + shell rendering
    --------------------------------------------------------- */
    var cur = { key: 'home', params: new URLSearchParams() };
    var slideTimer = null;

    function parseRoute() {
        var h = location.hash.replace(/^#\/?/, '') || 'home';
        var parts = h.split('?');
        return { path: parts[0].replace(/\/+$/, ''), params: new URLSearchParams(parts[1] || '') };
    }
    var pendingRoute = null;
    function render(keepScroll) {
        var y = window.scrollY;
        var r = parseRoute(), path = r.path || 'home';
        cur = { key: path, params: r.params };
        if (path.indexOf('admin') === 0 && !isAdmin()) {
            pendingRoute = location.hash;
            history.replaceState(null, '', '#/home');
            cur = { key: 'home', params: new URLSearchParams() };
            drawView(viewHome());
            afterRender();
            openLogin();
            return;
        }
        var html;
        switch (path) {
            case 'categories': html = viewCategories(); break;
            case 'products': html = viewProducts(r.params); break;
            case 'about': html = viewAbout(); break;
            case 'contact': html = viewContact(); break;
            case 'admin':
            case 'admin/report': cur.key = 'admin/report'; html = viewReport(); break;
            case 'admin/products': html = viewManage(); break;
            case 'admin/customers': html = viewCustomers(); break;
            case 'admin/settings': html = viewSettings(); break;
            default: cur.key = 'home'; html = viewHome();
        }
        drawView(html);
        afterRender();
        if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
    }
    function drawView(html) { $('#view').innerHTML = html; }
    function afterRender() {
        renderNav(); renderBottomNav(); renderFooter(); renderChrome();
        var q = cur.key === 'products' ? (cur.params.get('q') || '') : '';
        var si = $('#searchInput'); if (si && document.activeElement !== si) si.value = q;
        initSlider();
        document.title = S().shopName;
    }

    function renderChrome() {
        var s = S(), parts = s.shopName.trim().split(/\s+/);
        var sub = parts.length > 1 ? parts.pop() : '';
        $('#brandMain').textContent = parts.join(' ');
        $('#brandSub').textContent = sub; $('#brandSub').hidden = !sub;
        $('#sideBrand').textContent = s.shopName;
        var on = s.offerOn;
        $('#ticker').hidden = !on;
        $('#tickerText').textContent = t('offerTitle') + ': ' + offerStr();
        $('#sideOffer').hidden = !on;
        $('#sideOffer').innerHTML = '<b>' + t('offerTitle') + '</b>' + esc(offerStr());
        var tel = telLink(), wa = waLink('Hello');
        $('#sideContact').innerHTML = (tel || wa) ? '<h3>' + t('contactUs') + '</h3><div class="row">' +
            (tel ? '<a class="btn ghost sm" style="flex:1" href="' + esc(tel) + '">' + icon('phone') + t('call') + '</a>' : '') +
            (wa ? '<a class="btn wa sm" style="flex:1" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icon('chat') + 'WhatsApp</a>' : '') + '</div>'
            : '<a class="btn ghost sm" href="#/contact">' + icon('phone') + t('contactUs') + '</a>';
        $('#adminBtnText').textContent = isAdmin() ? t('admin') : t('adminCaps');
        $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'); });
    }

    function renderNav() {
        var k = cur.key;
        function item(href, key, ic) {
            var on = k === href.replace('#/', '');
            return '<a class="nav-item' + (on ? ' active' : '') + '" href="' + href + '"' + (on ? ' aria-current="page"' : '') + '>' + icon(ic) + '<span>' + t(key) + '</span></a>';
        }
        var h = item('#/home', 'home', 'home') + item('#/categories', 'categories', 'grid') + item('#/products', 'products', 'box') + item('#/about', 'about', 'info') + item('#/contact', 'contact', 'phone');
        if (isAdmin()) {
            h += '<p class="nav-group">' + icon('lock') + t('adminOnly') + '</p>' +
                item('#/admin/report', 'report', 'chart') + item('#/admin/products', 'manage', 'edit') +
                item('#/admin/customers', 'customers', 'users') + item('#/admin/settings', 'settings', 'gear') +
                '<button type="button" class="nav-item" data-act="logout">' + icon('logout') + '<span>' + t('logout') + '</span></button>';
        } else {
            h += '<button type="button" class="nav-item" data-act="adminBtn" style="margin-top:8px">' + icon('shield') + '<span>' + t('admin') + '</span></button>';
        }
        $('#nav').innerHTML = h;
    }
    function renderBottomNav() {
        var k = cur.key, n = cart.reduce(function (a, c) { return a + c.qty; }, 0);
        function a(href, key, ic) { var on = k === href.replace('#/', ''); return '<a class="bn-item' + (on ? ' active' : '') + '" href="' + href + '">' + icon(ic) + '<span>' + t(key) + '</span></a>'; }
        $('#bottomnav').innerHTML = a('#/home', 'home', 'home') + a('#/categories', 'categories', 'grid') + a('#/products', 'products', 'box') +
            '<button type="button" class="bn-item" data-act="openCart">' + icon('cart') + '<span>' + t('cart') + '</span><span class="cart-count"' + (n ? '' : ' hidden') + '>' + n + '</span></button>' +
            '<button type="button" class="bn-item' + (k.indexOf('admin') === 0 ? ' active' : '') + '" data-act="adminBtn">' + icon('shield') + '<span>' + t('admin') + '</span></button>';
    }
    function renderFooter() {
        $('#footer').innerHTML = '© ' + new Date().getFullYear() + ' ' + esc(S().shopName);
    }

    /* ---------------------------------------------------------
       Customer views
    --------------------------------------------------------- */
    /* Shows loading / error / empty-catalogue messages. Returns '' when there are products to show. */
    function catalogNoticeHTML() {
        if (catalog.status === 'loading') return '<div class="empty"><h3>' + t('loading') + '</h3></div>';
        if (catalog.status === 'error') {
            return '<div class="empty"><h3>' + t('catalogError') + '</h3><p>' + esc(catalog.error) + '</p>' +
                '<button type="button" class="btn primary" data-act="retryCatalog">' + t('retry') + '</button></div>';
        }
        if (!shopProducts().length) {
            return '<div class="empty"><h3>' + t('catalogEmpty') + '</h3><p>' + t('catalogEmptyHint') + '</p>' +
                (isAdmin() ? '<a class="btn gold" href="#/admin/products">' + icon('plus') + t('addProduct') + '</a>' : '') + '</div>';
        }
        return '';
    }
    function slideHTML(x, i) {
        var href = x.cat ? '#/products?cat=' + encodeURIComponent(x.cat) : '#/products';
        var art = x.img
            ? '<div class="slide-art photo"><img src="' + esc(x.img) + '" alt=""></div>'
            : '<div class="slide-art"><img src="' + esc(artURI(x.art || 'sofa', x.artColor || '#D9A66B', false)) + '" alt=""></div>';
        return '<div class="slide" style="--bg-c:' + esc(x.bg || '#1E2A4A') + '" id="slide-' + i + '">' + art +
            '<div class="slide-text"><h2 class="hero-title">' + esc(tok(pick(x.title, x.hi))) + '</h2><p>' + esc(tok(pick(x.sub, x.subHi))) + '</p>' +
            '<a class="btn gold" href="' + href + '">' + t('shopNow') + '</a></div></div>';
    }
    function heroHTML() {
        var s = db.slides; if (!s.length) return '';
        return '<section class="hero" aria-roledescription="carousel" aria-label="' + esc(t('offers')) + '"><div class="slides" id="slides">' + s.map(slideHTML).join('') + '</div>' +
            (s.length > 1 ? '<div class="dots" id="dots">' + s.map(function (x, i) { return '<button type="button" data-act="slide" data-id="' + i + '" aria-label="' + (i + 1) + '"></button>'; }).join('') + '</div>' +
                '<div class="arrows"><button type="button" data-act="slidePrev" aria-label="Previous">' + icon('left') + '</button><button type="button" data-act="slideNext" aria-label="Next">' + icon('right') + '</button></div>' : '') +
            '</section>';
    }
    function chipsHTML(active, q, sort) {
        function href(cat) {
            var p = []; if (cat) p.push('cat=' + encodeURIComponent(cat)); if (q) p.push('q=' + encodeURIComponent(q)); if (sort) p.push('sort=' + sort);
            return '#/products' + (p.length ? '?' + p.join('&') : '');
        }
        return '<nav class="chips" aria-label="' + esc(t('categories')) + '"><a class="chip' + (!active ? ' on' : '') + '" href="' + href('') + '">' + t('all') + '</a>' +
            shopCats().map(function (c) { return '<a class="chip' + (active === c.id ? ' on' : '') + '" href="' + href(c.id) + '">' + esc(cName(c)) + '</a>'; }).join('') + '</nav>';
    }
    function perksHTML() {
        return '<div class="perks"><div class="perk">' + icon('tag') + '<div><b>' + t('perk1') + '</b><span>' + t('perk1d') + '</span></div></div>' +
            '<div class="perk">' + icon('card') + '<div><b>' + t('perk2') + '</b><span>' + t('perk2d') + '</span></div></div>' +
            '<div class="perk">' + icon('chat') + '<div><b>' + t('perk3') + '</b><span>' + t('perk3d') + '</span></div></div></div>';
    }
    function viewHome() {
        var notice = catalogNoticeHTML();
        if (notice) return heroHTML() + perksHTML() + '<h2 class="sec-title">' + t('popular') + '</h2>' + notice;
        var all = shopProducts();
        var list = all.filter(function (p) { return p.featured; });
        if (!list.length) list = all.slice(0, 8);
        list = list.slice(0, 8);
        return heroHTML() + perksHTML() + '<h2 class="sec-title">' + t('shopByCat') + '</h2>' + chipsHTML('', '', '') +
            '<h2 class="sec-title" style="margin-top:14px">' + t('popular') + '</h2>' +
            (list.length ? '<div class="grid">' + list.map(cardHTML).join('') + '</div>' : emptyHTML()) +
            '<p style="text-align:center;margin-top:18px"><a class="btn primary" href="#/products">' + t('viewAll') + '</a></p>';
    }
    function emptyHTML() {
        return '<div class="empty"><h3>' + t('noResults') + '</h3><p>' + t('noResultsHint') + '</p><a class="btn primary" href="#/products">' + t('clearFilters') + '</a></div>';
    }
    function viewProducts(params) {
        var catParam = params.get('cat') || '', q = (params.get('q') || '').trim(), sort = params.get('sort') || '';
        var c = getCat(catParam), catId = c ? c.id : '';
        var notice = catalogNoticeHTML();
        if (notice) return '<div class="page-head"><div><h1>' + t('products') + '</h1></div></div>' + notice;
        var list = shopProducts().filter(function (p) {
            if (catId && p.cat !== catId) return false;
            if (q) { var hay = (p.name + ' ' + (p.hi || '') + ' ' + (p.desc || '') + ' ' + cName(getCat(p.cat)) + ' ' + ((getCat(p.cat) || {}).name || '')).toLowerCase(); return hay.indexOf(q.toLowerCase()) >= 0; }
            return true;
        });
        if (sort === 'low') list.sort(function (a, b) { return a.price - b.price; });
        else if (sort === 'high') list.sort(function (a, b) { return b.price - a.price; });
        var title = c ? cName(c) : t('products');
        var sortSel = '<label class="sr" style="display:contents"><select data-change="sort" aria-label="' + esc(t('sort')) + '">' +
            [['', 'sortNew'], ['low', 'sortLow'], ['high', 'sortHigh']].map(function (o) { return '<option value="' + o[0] + '"' + (sort === o[0] ? ' selected' : '') + '>' + t(o[1]) + '</option>'; }).join('') + '</select></label>';
        return '<div class="page-head"><div><h1>' + esc(title) + '</h1>' + (q ? '<p>“' + esc(q) + '”</p>' : '') + '</div></div>' +
            chipsHTML(catId, q, sort) +
            '<div class="toolbar"><span class="count">' + t('items', { n: list.length }) + '</span>' + sortSel + '</div>' +
            (list.length ? '<div class="grid">' + list.map(cardHTML).join('') + '</div>' : emptyHTML());
    }
    function viewCategories() {
        var notice = catalogNoticeHTML();
        if (notice) return '<div class="page-head"><h1>' + t('categories') + '</h1></div>' + notice;
        var act = shopProducts();
        return '<div class="page-head"><h1>' + t('categories') + '</h1></div><div class="cat-grid">' + shopCats().map(function (c) {
            var n = act.filter(function (p) { return p.cat === c.id; }).length;
            var img = c.img || artURI(c.art || 'sofa', colorFor(c.id), true);
            return '<a class="cat-tile" href="#/products?cat=' + encodeURIComponent(c.id) + '"><img src="' + esc(img) + '" data-fb="' + esc(artURI(c.art || 'sofa', colorFor(c.id), true)) + '" alt="" loading="lazy"><div><b>' + esc(cName(c)) + '</b><small>' + t('items', { n: n }) + '</small></div></a>';
        }).join('') + '</div>';
    }
    function viewAbout() {
        var txt = pick(S().about, S().aboutHi);
        return '<div class="page-head"><h1>' + t('aboutTitle') + '</h1></div><div class="prose">' +
            String(txt).split(/\n+/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' + perksHTML();
    }
    function viewContact() {
        var s = S(), rows = '';
        if (s.phone) rows += '<div class="info">' + icon('phone') + '<div><b>' + t('phone') + '</b><a href="' + esc(telLink()) + '">' + esc(s.phone) + '</a></div></div>';
        if (s.whatsapp) rows += '<div class="info">' + icon('chat') + '<div><b>WhatsApp</b><a href="' + esc(waLink('Hello')) + '" target="_blank" rel="noopener">' + esc(s.whatsapp) + '</a></div></div>';
        if (s.email) rows += '<div class="info">' + icon('mail') + '<div><b>' + t('email') + '</b><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a></div></div>';
        if (s.address) rows += '<div class="info">' + icon('pin') + '<div><b>' + t('visitUs') + '</b>' + esc(s.address) + '<br><a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.shopName + ' ' + s.address) + '" target="_blank" rel="noopener">' + t('openMaps') + '</a></div></div>';
        if (s.hours) rows += '<div class="info">' + icon('clock') + '<div><b>' + t('hours') + '</b>' + esc(s.hours) + '</div></div>';
        if (!rows) rows = '<div class="empty"><p>' + t('contactSoon') + '</p></div>';
        return '<div class="page-head"><h1>' + t('contactTitle') + '</h1></div><div class="split"><div class="info-list">' + rows + '</div>' +
            '<form class="card" data-form="enquiry"><h2>' + t('sendMsg') + '</h2><div class="field"><label for="c-name">' + t('name') + '</label><input id="c-name" name="name" autocomplete="name"></div>' +
            '<div class="field"><label for="c-msg">' + t('yourMsg') + '</label><textarea id="c-msg" name="msg" required></textarea></div>' +
            '<button class="btn primary block" type="submit">' + icon('chat') + t('sendMsg') + '</button></form></div>';
    }

    /* ---------------------------------------------------------
       Hero slider
    --------------------------------------------------------- */
    function initSlider() {
        clearInterval(slideTimer);
        var el = $('#slides'); if (!el) return;
        var dots = $$('#dots button'), n = el.children.length, paused = false, resume;
        function idx() { return Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); }
        function mark() { var i = idx(); dots.forEach(function (d, k) { d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); }); }
        var tm; el.addEventListener('scroll', function () { clearTimeout(tm); tm = setTimeout(mark, 50); }, { passive: true });
        function hold() { paused = true; clearTimeout(resume); resume = setTimeout(function () { paused = false; }, 7000); }
        ['touchstart', 'pointerdown', 'wheel', 'focusin'].forEach(function (ev) { el.addEventListener(ev, hold, { passive: true }); });
        var hero = el.parentNode;
        hero.addEventListener('mouseenter', function () { paused = true; clearTimeout(resume); });
        hero.addEventListener('mouseleave', function () { paused = false; });
        mark();
        if (n > 1 && !reduceMotion) {
            slideTimer = setInterval(function () { if (!paused && !document.hidden && document.body.contains(el)) goSlide(idx() + 1); }, 5500);
        }
    }
    function goSlide(i) {
        var el = $('#slides'); if (!el) return;
        var n = el.children.length; i = ((i % n) + n) % n;
        el.scrollTo({ left: i * el.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    /* ---------------------------------------------------------
       Admin: login / logout
    --------------------------------------------------------- */
    var fails = 0, lockUntil = 0;
    function openLogin() {
        openModal('<form class="mform" data-form="login" novalidate><div class="mhead"><h2>' + icon('lock') + ' ' + t('adminLogin') + '</h2><button type="button" class="icon-btn dark" data-act="closeModal" aria-label="' + esc(t('close')) + '">' + icon('close') + '</button></div>' +
            '<div class="mbody"><p class="muted" style="margin-bottom:12px">' + t('adminHint') + '</p>' +
            '<div class="field"><label for="a-pw">' + t('password') + '</label><div class="pw-wrap"><input id="a-pw" name="pw" type="password" autocomplete="current-password" required><button type="button" data-act="togglePw">' + t('show') + '</button></div><div class="err" data-err="pw"></div></div></div>' +
            '<div class="mfoot"><button class="btn primary block" type="submit">' + t('login') + '</button></div></form>');
    }
    function doLogin(f) {
        var err = $('[data-err="pw"]', f), now = Date.now();
        if (now < lockUntil) { err.textContent = t('locked', { n: Math.ceil((lockUntil - now) / 1000) }); return; }
        var pw = String(new FormData(f).get('pw') || '');
        if (hashPw(pw) === S().pw) {
            fails = 0; setAdmin(true); closeModal(); toast(t('welcomeAdmin'));
            var go = pendingRoute && pendingRoute.indexOf('admin') >= 0 ? pendingRoute : '#/admin/report';
            pendingRoute = null;
            if (location.hash === go) render(); else location.hash = go;
            renderChrome(); renderNav(); renderBottomNav();
        } else {
            fails++; err.textContent = t('wrongPw');
            if (fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; err.textContent = t('locked', { n: 30 }); }
            var inp = $('#a-pw'); if (inp) { inp.value = ''; inp.focus(); }
        }
    }
    function logout() {
        setAdmin(false); closeAll(); toast(t('loggedOut'));
        renderChrome(); renderNav(); renderBottomNav();
        if (location.hash.indexOf('admin') >= 0) location.hash = '#/home'; else render(true);
        /* Also end the database session so a shared device cannot keep writing. */
        if (furnitureDB && dbSession) {
            Promise.resolve(furnitureDB.auth.signOut({ scope: 'local' })).catch(function () { }).then(function () {
                dbSession = null;
                return loadSupabaseCatalog();
            }).then(function () { render(true); });
        }
    }

    /* Supabase Auth sign-in (needed for every database write). */
    function openDbLogin(cb) {
        dbLoginCb = typeof cb === 'function' ? cb : null;
        openModal('<form class="mform" data-form="dblogin" novalidate><div class="mhead"><h2>' + icon('lock') + ' ' + t('dbSignIn') + '</h2><button type="button" class="icon-btn dark" data-act="closeModal" aria-label="' + esc(t('close')) + '">' + icon('close') + '</button></div>' +
            '<div class="mbody"><p class="muted" style="margin-bottom:12px">' + t('dbHelp') + '</p>' +
            '<div class="field"><label for="db-email">' + t('dbEmail') + '</label><input id="db-email" name="email" type="email" autocomplete="username" required></div>' +
            '<div class="field"><label for="db-pw">' + t('password') + '</label><div class="pw-wrap"><input id="db-pw" name="pw" type="password" autocomplete="current-password" required><button type="button" data-act="togglePw">' + t('show') + '</button></div><div class="err" data-err="dbpw"></div></div></div>' +
            '<div class="mfoot"><button class="btn primary block" type="submit">' + t('dbSignIn') + '</button></div></form>');
    }
    async function doDbLogin(f) {
        if (busy.dblogin) return;
        var fd = new FormData(f), email = String(fd.get('email') || '').trim(), pw = String(fd.get('pw') || '');
        var err = $('[data-err="dbpw"]', f), btn = $('button[type=submit]', f);
        if (!email || !pw) { err.textContent = t('fillRequired'); return; }
        if (!furnitureDB) { err.textContent = t('catalogError'); return; }
        busy.dblogin = true; setBusy(btn, true);
        try {
            var r = await furnitureDB.auth.signInWithPassword({ email: email, password: pw });
            if (r.error) { err.textContent = t('dbSignInFail'); return; }
            dbSession = r.data && r.data.session ? r.data.session : null;
            var cb = dbLoginCb; dbLoginCb = null;
            closeModal();
            toast(t('dbSignedIn'));
            await loadSupabaseCatalog();     // admins also load hidden products
            render(true);
            if (cb) cb();
        } catch (e) {
            err.textContent = dbErrorMessage(e);
        } finally {
            busy.dblogin = false; setBusy(btn, false);
        }
    }
    async function dbLogout() {
        if (!furnitureDB) return;
        try { await furnitureDB.auth.signOut({ scope: 'local' }); } catch (e) { }
        dbSession = null;
        toast(t('dbSignedOut'));
        await loadSupabaseCatalog();
        render(true);
    }
    /* Banner shown on admin pages while the database session is missing. */
    function dbNoticeHTML() {
        if (dbSession) return '';
        return '<div class="notice bad"><span>' + icon('lock') + ' ' + t('dbNotSignedIn') + '</span>' +
            '<button type="button" class="btn gold sm" data-act="dbLogin">' + t('dbSignIn') + '</button></div>';
    }

    /* ---------------------------------------------------------
       Admin: shared helpers
    --------------------------------------------------------- */
    function fileToDataURL(file, max, q) {
        return new Promise(function (res, rej) {
            var fr = new FileReader();
            fr.onerror = rej;
            fr.onload = function () {
                var img = new Image();
                img.onerror = rej;
                img.onload = function () {
                    var k = Math.min(1, max / Math.max(img.width, img.height));
                    var c = document.createElement('canvas');
                    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
                    var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
                    res(c.toDataURL('image/jpeg', q));
                };
                img.src = fr.result;
            };
            fr.readAsDataURL(file);
        });
    }
    function download(name, text, type) {
        var blob = new Blob([text], { type: type || 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function csv(rows) {
        return '\ufeff' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    }
    function dateStr(iso) { return new Date(iso).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    function stLabel(s) { return t({ pending: 'sPending', confirmed: 'sConfirmed', delivered: 'sDelivered', cancelled: 'sCancelled' }[s] || 'sPending'); }
    function adminHead(title, extra) {
        return '<div class="page-head"><div><h1>' + title + '</h1></div>' + (extra ? '<div class="btn-row">' + extra + '</div>' : '') + '</div>';
    }

    /* ---------------------------------------------------------
       Admin: database writes (products)
    --------------------------------------------------------- */
    async function dbUpdateProduct(p, fields) {
        var payload = Object.assign({}, fields, { updated_at: new Date().toISOString() });
        var res = await furnitureDB.from('products').update(payload).eq('id', p.dbId).select();
        if (res.error) throw res.error;
        if (!res.data || !res.data.length) throw noRowsError();
        return replaceProduct(mapProduct(res.data[0]));
    }
    async function dbInsertProduct(payload) {
        var res = await furnitureDB.from('products').insert(payload).select();
        if (res.error) throw res.error;
        if (!res.data || !res.data.length) throw noRowsError();
        return replaceProduct(mapProduct(res.data[0]));
    }
    async function dbDeleteProduct(p) {
        var res = await furnitureDB.from('products').delete().eq('id', p.dbId).select();
        if (res.error) throw res.error;
        if (!res.data || !res.data.length) throw noRowsError();
    }
    /* Changes stock in the database for an order's items. sign: -1 takes stock, +1 gives it back.
       If one product fails, the ones already changed are put back. */
    async function adjustStock(items, sign) {
        var agg = {}, order = [], done = [];
        items.forEach(function (i) { var k = normPid(i.id); if (!(k in agg)) { agg[k] = 0; order.push(k); } agg[k] += i.qty; });
        try {
            for (var n = 0; n < order.length; n++) {
                var k = order[n], p = getP(k);
                if (!p) continue;                       // product was deleted or is an old local id
                var next = Math.max(0, Math.min(MAX_STOCK, p.stock + sign * agg[k]));
                if (next === p.stock) continue;
                var prev = p.stock;
                await dbUpdateProduct(p, { stock_quantity: next });
                done.push({ id: k, prev: prev });
            }
            return true;
        } catch (err) {
            for (var j = done.length - 1; j >= 0; j--) {
                var q = getP(done[j].id);
                if (q) { try { await dbUpdateProduct(q, { stock_quantity: done[j].prev }); } catch (e) { } }
            }
            toast(dbErrorMessage(err), 'err');
            return false;
        }
    }

    /* ---------------------------------------------------------
       Admin: Report
    --------------------------------------------------------- */
    function viewReport() {
        var valid = db.orders.filter(function (o) { return o.status !== 'cancelled'; });
        var revenue = valid.reduce(function (s, o) { return s + o.total; }, 0);
        var pending = db.orders.filter(function (o) { return o.status === 'pending'; }).length;
        var low = db.products.filter(function (p) { return p.stock <= 3; }).length;
        var s = S();
        var setup = (!s.phone || !s.whatsapp || !s.upi)
            ? '<div class="notice"><span>' + icon('info') + ' ' + t('setup') + '</span><a class="btn gold sm" href="#/admin/settings">' + t('openSettings') + '</a></div>' : '';
        var pwWarn = s.pw === hashPw(DEFAULT_PASSWORD)
            ? '<div class="notice bad"><span>' + icon('lock') + ' ' + t('defaultPwWarn') + '</span><a class="btn gold sm" href="#/admin/settings">' + t('openSettings') + '</a></div>' : '';

        var days = [], i;
        for (i = 6; i >= 0; i--) {
            var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
            days.push({ d: d, sum: 0 });
        }
        valid.forEach(function (o) {
            var od = new Date(o.date); od.setHours(0, 0, 0, 0);
            days.forEach(function (x) { if (x.d.getTime() === od.getTime()) x.sum += o.total; });
        });
        var maxD = Math.max.apply(null, days.map(function (x) { return x.sum; }).concat([1]));
        var bars = days.map(function (x) {
            return '<div class="bar"><em>' + (x.sum ? (x.sum >= 1000 ? Math.round(x.sum / 1000) + 'k' : x.sum) : '') + '</em><i style="height:' + Math.max(2, Math.round(x.sum / maxD * 100)) + '%"></i>' +
                '<span>' + x.d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short' }) + '</span></div>';
        }).join('');

        var byCat = {};
        valid.forEach(function (o) { o.items.forEach(function (it) { byCat[it.cat] = (byCat[it.cat] || 0) + it.price * it.qty; }); });
        var catKeys = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
        var maxC = Math.max.apply(null, catKeys.map(function (k) { return byCat[k]; }).concat([1]));
        var catHTML = catKeys.length ? catKeys.map(function (k) {
            return '<div class="hbar"><span>' + esc(cName(getCat(k)) || k) + '</span><div class="track"><i style="width:' + Math.round(byCat[k] / maxC * 100) + '%"></i></div><b>' + inr(byCat[k]) + '</b></div>';
        }).join('') : '<p class="muted">—</p>';

        var ords = db.orders.slice(0, 30).map(orderHTML).join('') || '<div class="empty"><p>' + t('noOrders') + '</p></div>';
        return adminHead(t('reportTitle'), db.orders.length ? '<button type="button" class="btn ghost" data-act="exportOrders">' + icon('download') + t('exportCsv') + '</button>' : '') +
            dbNoticeHTML() + pwWarn + setup +
            '<div class="stats"><div class="stat"><span>' + t('revenue') + '</span><b>' + inr(revenue) + '</b></div>' +
            '<div class="stat"><span>' + t('orders') + '</span><b>' + db.orders.length + '</b></div>' +
            '<div class="stat"><span>' + t('pending') + '</span><b>' + pending + '</b></div>' +
            '<div class="stat"><span>' + t('customers') + '</span><b>' + customerList().length + '</b></div>' +
            '<div class="stat"><span>' + t('products') + '</span><b>' + db.products.length + '</b></div>' +
            '<div class="stat' + (low ? ' warn' : '') + '"><span>' + t('lowStock') + '</span><b>' + low + '</b></div></div>' +
            '<div class="panels"><div class="card"><h2>' + t('last7') + '</h2><div class="bars">' + bars + '</div></div>' +
            '<div class="card"><h2>' + t('byCat') + '</h2>' + catHTML + '</div></div>' +
            '<h2 class="sec-title">' + t('recentOrders') + '</h2>' + ords;
    }
    function orderHTML(o) {
        var opts = ['pending', 'confirmed', 'delivered', 'cancelled'].map(function (s) { return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + stLabel(s) + '</option>'; }).join('');
        var wa = ''; var d = String(o.customer.phone).replace(/\D/g, ''); if (d) { if (d.length === 10) d = '91' + d; wa = 'https://wa.me/' + d; }
        return '<details class="order"><summary><b>' + o.id + '</b><span class="amt">' + inr(o.total) + '</span>' +
            '<small>' + esc(o.customer.name) + ' · ' + dateStr(o.date) + '</small><span class="st ' + o.status + '">' + stLabel(o.status) + '</span></summary>' +
            '<div class="inner"><div><b>' + t('phone') + ':</b> <a href="tel:' + esc(o.customer.phone) + '">' + esc(o.customer.phone) + '</a></div>' +
            '<div><b>' + t('address') + ':</b> ' + esc(o.customer.address) + '</div>' +
            (o.customer.note ? '<div><b>' + t('note') + ':</b> ' + esc(o.customer.note) + '</div>' : '') +
            '<div><b>' + t('paymentLbl') + ':</b> ' + esc(PAY_NAME[o.pay] || o.pay) + '</div>' +
            '<ul>' + o.items.map(function (i) { return '<li>' + esc(i.name) + ' × ' + i.qty + ' — ' + inr(i.price * i.qty) + '</li>'; }).join('') + '</ul>' +
            (o.discount ? '<div class="muted">' + t('discount') + ': −' + inr(o.discount) + '</div>' : '') +
            '<div class="field" style="margin:6px 0 0"><label for="st-' + o.id + '">' + t('status') + '</label><select id="st-' + o.id + '" data-change="ostatus" data-id="' + o.id + '">' + opts + '</select><span class="hint">' + t('stockHint') + '</span></div>' +
            (wa ? '<a class="btn wa sm" style="justify-self:start" href="' + wa + '" target="_blank" rel="noopener">' + icon('chat') + 'WhatsApp</a>' : '') +
            '</div></details>';
    }
    /* Stock moves exactly once per order: taken when it is first confirmed/delivered,
       given back when it is cancelled. The stockDeducted flag on the order guarantees that. */
    async function setOrderStatus(id, status) {
        var o = null; db.orders.forEach(function (x) { if (x.id === id) o = x; });
        if (!o || o.status === status) return;
        if (busy['o' + id]) { render(true); return; }
        busy['o' + id] = true;
        try {
            var needDeduct = (status === 'confirmed' || status === 'delivered') && !o.stockDeducted;
            var needRestore = status === 'cancelled' && !!o.stockDeducted;
            if (needDeduct || needRestore) {
                if (!(await requireDb())) { render(true); return; }
                var ok = await adjustStock(o.items, needDeduct ? -1 : 1);
                if (!ok) { toast(t('orderStockFail'), 'err'); render(true); return; }
                o.stockDeducted = needDeduct;
            }
            o.status = status;
            if (save()) toast(t('saved'));
            render(true);
        } finally {
            busy['o' + id] = false;
        }
    }

    /* ---------------------------------------------------------
       Admin: Customers
    --------------------------------------------------------- */
    function customerList() {
        var m = {}, order = [];
        db.orders.forEach(function (o) {
            var k = String(o.customer.phone).replace(/\D/g, '').slice(-10) || o.customer.phone;
            if (!m[k]) { m[k] = { name: o.customer.name, phone: o.customer.phone, address: o.customer.address, orders: 0, spent: 0, last: o.date }; order.push(k); }
            m[k].orders++;
            if (o.status !== 'cancelled') m[k].spent += o.total;
        });
        return order.map(function (k) { return m[k]; });
    }
    function viewCustomers() {
        var list = customerList();
        var q = (cur.params.get('q') || '').toLowerCase();
        var rows = list.filter(function (c) { return !q || (c.name + ' ' + c.phone).toLowerCase().indexOf(q) >= 0; }).map(function (c) {
            var d = String(c.phone).replace(/\D/g, ''); if (d.length === 10) d = '91' + d;
            return '<div class="crow"><div class="top"><b>' + esc(c.name) + '</b><span>' + inr(c.spent) + '</span></div>' +
                '<div class="muted">' + esc(c.address) + '</div><div class="muted">' + t('orders') + ': ' + c.orders + ' · ' + t('lastOrder') + ': ' + dateStr(c.last) + '</div>' +
                '<div class="acts"><a class="btn ghost sm" href="tel:' + esc(c.phone) + '">' + icon('phone') + esc(c.phone) + '</a><a class="btn wa sm" href="https://wa.me/' + d + '" target="_blank" rel="noopener">' + icon('chat') + 'WhatsApp</a></div></div>';
        }).join('');
        return adminHead(t('customersTitle') + ' (' + list.length + ')', list.length ? '<button type="button" class="btn ghost" data-act="exportCustomers">' + icon('download') + t('exportCsv') + '</button>' : '') +
            (list.length ? '<div class="field"><input type="search" data-change="custq" placeholder="' + esc(t('searchCust')) + '" aria-label="' + esc(t('searchCust')) + '" value="' + esc(q) + '"></div>' + (rows || '') : '<div class="empty"><p>' + t('noCustomers') + '</p></div>');
    }

    /* ---------------------------------------------------------
       Admin: Manage products
    --------------------------------------------------------- */
    function viewManage() {
        var q = (cur.params.get('q') || '').toLowerCase();
        var list = db.products.filter(function (p) { return !q || (p.name + ' ' + (p.hi || '')).toLowerCase().indexOf(q) >= 0; });
        var rows = list.map(function (p) {
            return '<div class="arow"><img src="' + esc(pImgs(p)[0]) + '"' + fbAttr(p) + ' alt=""><div class="nm"><b>' + esc(p.name) + '</b><small>' + esc(cName(getCat(p.cat))) + (p.featured ? ' · ★' : '') + (p.active === false ? ' · ' + t('hidden') : '') + '</small></div>' +
                '<div class="edits"><label>' + t('price') + ' (₹)<input class="inline-input" type="number" min="0" inputmode="numeric" value="' + p.price + '" data-change="price" data-id="' + esc(p.id) + '"></label>' +
                '<label>' + t('stock') + '<input class="inline-input" type="number" min="0" inputmode="numeric" value="' + p.stock + '" data-change="stockq" data-id="' + esc(p.id) + '"></label></div>' +
                '<div class="btns"><button type="button" class="btn ghost sm" data-act="editProduct" data-id="' + esc(p.id) + '">' + icon('edit') + t('edit') + '</button>' +
                '<button type="button" class="btn danger sm" data-act="delProduct" data-id="' + esc(p.id) + '" aria-label="' + esc(t('delete')) + '">' + icon('trash') + '<span>' + t('delete') + '</span></button></div></div>';
        }).join('');
        var body;
        if (catalog.status === 'loading') body = '<div class="empty"><h3>' + t('loading') + '</h3></div>';
        else if (catalog.status === 'error') body = '<div class="empty"><h3>' + t('catalogError') + '</h3><p>' + esc(catalog.error) + '</p><button type="button" class="btn primary" data-act="retryCatalog">' + t('retry') + '</button></div>';
        else body = rows || '<div class="empty"><p>' + t('noProducts') + '</p></div>';
        return adminHead(t('manageTitle') + ' (' + db.products.length + ')', '<button type="button" class="btn gold" data-act="addProduct">' + icon('plus') + t('addProduct') + '</button>') +
            dbNoticeHTML() +
            '<div class="field"><input type="search" data-change="prodq" placeholder="' + esc(t('filterProducts')) + '" aria-label="' + esc(t('filterProducts')) + '" value="' + esc(q) + '"></div>' + body;
    }
    /* Photos picked from the device are kept only while the form is open (preview). Only the image URL is saved. */
    var formImgs = [];
    function renderPhotoPrev() {
        var el = $('#photoPrev'); if (!el) return;
        el.innerHTML = formImgs.map(function (s, i) { return '<div class="ph"><img src="' + esc(s) + '" alt=""><button type="button" data-act="rmPhoto" data-id="' + i + '" aria-label="' + esc(t('remove')) + '">×</button></div>'; }).join('');
        var b = $('#pickBtn'); if (b) b.disabled = formImgs.length >= 4;
    }
    function openProductForm(id) {
        var p = id ? getP(id) : null;
        formImgs = [];
        var cats = db.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (p && p.cat === c.id ? ' selected' : '') + '>' + esc(cName(c)) + (c.active === false ? ' (' + t('hidden') + ')' : '') + '</option>'; }).join('') +
            '<option value=""' + (p && !p.cat ? ' selected' : '') + '>' + t('noCategory') + '</option>';
        openModal('<form class="mform" data-form="product" data-id="' + esc(id || '') + '" novalidate>' +
            '<div class="mhead"><h2>' + t(p ? 'editProduct' : 'addProduct') + '</h2><button type="button" class="icon-btn dark" data-act="closeModal" aria-label="' + esc(t('close')) + '">' + icon('close') + '</button></div>' +
            '<div class="mbody">' +
            '<div class="field"><label for="f-name">' + t('nameEn') + ' *</label><input id="f-name" name="name" required maxlength="200" value="' + esc(p ? p.name : '') + '"></div>' +
            '<div class="field"><label for="f-hi">' + t('nameHi') + '</label><input id="f-hi" name="hi" lang="hi" maxlength="200" value="' + esc(p ? p.hi : '') + '"></div>' +
            '<div class="field"><label for="f-cat">' + t('category') + '</label><select id="f-cat" name="cat">' + cats + '</select></div>' +
            '<div class="two"><div class="field"><label for="f-price">' + t('price') + ' (₹) *</label><input id="f-price" name="price" type="number" min="1" step="any" inputmode="decimal" required value="' + (p ? p.price : '') + '"></div>' +
            '<div class="field"><label for="f-mrp">' + t('mrp') + '</label><input id="f-mrp" name="mrp" type="number" min="0" step="any" inputmode="decimal" value="' + (p && p.mrp ? p.mrp : '') + '"></div></div>' +
            '<div class="field"><label for="f-stock">' + t('stock') + '</label><input id="f-stock" name="stock" type="number" min="0" step="1" inputmode="numeric" value="' + (p ? p.stock : 1) + '"></div>' +
            '<div class="field"><label for="f-desc">' + t('descEn') + '</label><textarea id="f-desc" name="desc">' + esc(p ? p.desc : '') + '</textarea></div>' +
            '<div class="field"><label for="f-dhi">' + t('descHi') + '</label><textarea id="f-dhi" name="descHi" lang="hi">' + esc(p ? p.descHi : '') + '</textarea></div>' +
            '<div class="field"><label for="f-url">' + t('imageUrl') + '</label><input id="f-url" name="imageUrl" type="url" inputmode="url" autocapitalize="none" placeholder="https://" value="' + esc(p ? p.imgUrl : '') + '"><span class="hint">' + t('imageUrlHint') + '</span></div>' +
            '<div class="field"><span class="lbl">' + t('devicePhotos') + '</span><div class="photos" id="photoPrev"></div>' +
            '<button type="button" class="btn ghost" id="pickBtn" data-act="pickPhotos" style="justify-self:start">' + icon('plus') + t('addPhotos') + '</button>' +
            '<input type="file" id="photoInput" accept="image/*" multiple hidden data-change="photos"></div>' +
            '<label class="check"><input type="checkbox" name="featured"' + (p && p.featured ? ' checked' : '') + '>' + t('featured') + '</label>' +
            '<label class="check"><input type="checkbox" name="active"' + (!p || p.active !== false ? ' checked' : '') + '>' + t('visibleInShop') + '</label>' +
            '<div class="err" id="formErr" style="color:var(--danger)"></div></div>' +
            '<div class="mfoot"><button class="btn primary block" type="submit">' + t('save') + '</button></div></form>');
        renderPhotoPrev();
    }
    async function saveProduct(f) {
        if (busy.product) return;                         // blocks double taps
        var fd = new FormData(f), id = f.dataset.id, errEl = $('#formErr');
        var fail = function (msg) { if (errEl) errEl.textContent = msg; };
        fail('');

        var name = String(fd.get('name') || '').trim();
        if (!name) return fail(t('fillRequired'));
        var price = Number(String(fd.get('price') || '').trim());
        if (!isFinite(price) || price <= 0 || price > MAX_PRICE) return fail(t('priceInvalid'));
        price = Math.round(price * 100) / 100;
        var mrpRaw = String(fd.get('mrp') || '').trim(), mrp = mrpRaw === '' ? 0 : Number(mrpRaw);
        if (!isFinite(mrp) || mrp < 0 || mrp > MAX_PRICE || (mrp > 0 && mrp < price)) return fail(t('mrpInvalid'));
        mrp = Math.round(mrp * 100) / 100;
        var stockRaw = String(fd.get('stock') || '').trim(), stock = stockRaw === '' ? 0 : Number(stockRaw);
        if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) return fail(t('stockInvalid'));
        var url = String(fd.get('imageUrl') || '').trim();
        if (url && (!/^https?:\/\/\S+$/i.test(url) || url.length > 2000)) return fail(t('imageUrlBad'));

        var p = id ? getP(id) : null;
        if (id && !p) return fail(t('errGeneric'));
        if (!p) {
            var dup = db.products.some(function (x) { return x.name.trim().toLowerCase() === name.toLowerCase(); });
            if (dup && !confirm(t('nameExists'))) return;
        }
        var cc = getCat(String(fd.get('cat') || ''));
        var payload = {
            category_id: cc ? cc.dbId : null,
            name: name,
            name_hi: String(fd.get('hi') || '').trim() || null,
            description: String(fd.get('desc') || '').trim() || null,
            description_hi: String(fd.get('descHi') || '').trim() || null,
            price: price,
            mrp: mrp > 0 ? mrp : null,
            stock_quantity: stock,
            image_url: url || null,
            is_active: !!fd.get('active'),
            featured: !!fd.get('featured')
        };
        if (!p) {
            var taken = {}; db.products.forEach(function (x) { taken[x.slug] = true; });
            var base = slugify(name), slug = base, n = 1;
            while (taken[slug]) { n++; slug = base + '-' + n; }
            payload.slug = slug + '-' + Math.random().toString(36).slice(2, 6);
        }

        var btn = $('button[type=submit]', f);
        busy.product = true; setBusy(btn, true);          // set BEFORE any await
        try {
            if (!(await requireDb({ inline: true }))) return;
            if (p) await dbUpdateProduct(p, payload); else await dbInsertProduct(payload);
            var hadDevicePhotos = formImgs.length > 0 && !url;
            formImgs = [];
            closeModal();
            toast(hadDevicePhotos ? t('photosNotSaved') : t('saved'));
            render(true);
        } catch (err) {
            console.error('Saving product failed:', err);
            fail(dbErrorMessage(err));
            toast(dbErrorMessage(err), 'err');
        } finally {
            busy.product = false; setBusy(btn, false);
        }
    }
    async function deleteProduct(id) {
        var p = getP(id); if (!p) return;
        if (busy['d' + id]) return;
        if (!confirm(t('confirmDelete'))) return;
        if (!(await requireDb())) return;
        busy['d' + id] = true;
        try {
            try {
                await dbDeleteProduct(p);
            } catch (err) {
                if (err && err.code === '23503') {          // linked to other records: offer to hide instead
                    if (confirm(t('confirmDeactivate'))) {
                        await dbUpdateProduct(p, { is_active: false });
                        toast(t('deactivated'));
                        render(true);
                    }
                    return;
                }
                throw err;
            }
            db.products = db.products.filter(function (x) { return x.id !== p.id; });
            cart = cart.filter(function (c) { return c.id !== p.id; }); saveCart(); renderCart();
            toast(t('deleted'));
            render(true);
        } catch (err) {
            console.error('Deleting product failed:', err);
            toast(dbErrorMessage(err), 'err');
        } finally {
            busy['d' + id] = false;
        }
    }
    /* Inline price / stock edits from the product list. */
    async function saveInlineField(el, field) {
        var p = getP(el.dataset.id); if (!p) return;
        var key = 'i' + p.id + field;
        if (busy[key]) return;
        var prev = field === 'price' ? p.price : p.stock;
        var raw = String(el.value).trim(), v = raw === '' ? NaN : Number(raw);
        if (field === 'price') {
            if (!isFinite(v) || v <= 0 || v > MAX_PRICE) { toast(t('priceInvalid'), 'err'); el.value = prev; return; }
            v = Math.round(v * 100) / 100;
            if (p.mrp && p.mrp < v) { toast(t('mrpInvalid'), 'err'); el.value = prev; return; }
        } else if (!Number.isInteger(v) || v < 0 || v > MAX_STOCK) {
            toast(t('stockInvalid'), 'err'); el.value = prev; return;
        }
        if (v === prev) { el.value = prev; return; }
        if (!(await requireDb())) { el.value = prev; return; }
        busy[key] = true; el.disabled = true;
        try {
            await dbUpdateProduct(p, field === 'price' ? { price: v } : { stock_quantity: v });
            toast(t('saved'));
            renderCart();
        } catch (err) {
            console.error('Inline update failed:', err);
            el.value = prev;
            toast(dbErrorMessage(err), 'err');
        } finally {
            busy[key] = false; el.disabled = false;
        }
    }

    /* ---------------------------------------------------------
       Admin: categories (database)
    --------------------------------------------------------- */
    async function saveCategoryField(el, field) {
        var c = getCat(el.dataset.id); if (!c) return;
        var key = 'c' + c.id + field;
        if (busy[key]) return;
        var prev = field === 'name' ? c.name : (field === 'hi' ? c.hi : c.art);
        var val = String(el.value).trim();
        if (field === 'name' && !val) { el.value = prev; return; }
        if (val === prev) return;
        if (!(await requireDb())) { el.value = prev; return; }
        var payload = field === 'name' ? { name: val } : (field === 'hi' ? { name_hi: val || null } : { art: val });
        busy[key] = true; el.disabled = true;
        try {
            var res = await furnitureDB.from('categories').update(payload).eq('id', c.dbId).select();
            if (res.error) throw res.error;
            if (!res.data || !res.data.length) throw noRowsError();
            replaceCategory(res.data[0]);
            toast(t('saved'));
        } catch (err) {
            console.error('Category update failed:', err);
            el.value = prev;
            toast(dbErrorMessage(err), 'err');
        } finally {
            busy[key] = false; el.disabled = false;
        }
    }
    async function addCategory(f) {
        if (busy.addcat) return;
        var fd = new FormData(f), name = String(fd.get('name') || '').trim();
        if (!name) { var ni = $('[name=name]', f); if (ni) ni.focus(); return; }
        if (db.categories.some(function (c) { return c.name.trim().toLowerCase() === name.toLowerCase(); })) { toast(t('errDup'), 'err'); return; }
        if (!(await requireDb())) return;
        var base = slugify(name), slug = base, n = 1, taken = {};
        db.categories.forEach(function (c) { taken[c.slug] = true; });
        while (taken[slug]) { n++; slug = base + '-' + n; }
        var art = String(fd.get('art') || 'sofa');
        var payload = { name: name, slug: slug, art: ART_TYPES.indexOf(art) >= 0 ? art : 'sofa', is_active: true };
        var hi = String(fd.get('hi') || '').trim();
        if (catalog.catHi && hi) payload.name_hi = hi;
        var btn = $('button[type=submit]', f);
        busy.addcat = true; setBusy(btn, true);
        try {
            var res = await furnitureDB.from('categories').insert(payload).select();
            if (res.error) throw res.error;
            if (!res.data || !res.data.length) throw noRowsError();
            replaceCategory(res.data[0]);
            toast(t('saved'));
            render(true);
        } catch (err) {
            console.error('Adding category failed:', err);
            toast(dbErrorMessage(err), 'err');
        } finally {
            busy.addcat = false; setBusy(btn, false);
        }
    }
    async function deleteCategory(id) {
        var c = getCat(id); if (!c) return;
        if (db.products.some(function (p) { return p.cat === c.id; })) { toast(t('catInUse'), 'err'); return; }
        if (busy['dc' + c.id]) return;
        if (!confirm(t('confirmDelete'))) return;
        if (!(await requireDb())) return;
        busy['dc' + c.id] = true;
        try {
            var res = await furnitureDB.from('categories').delete().eq('id', c.dbId).select();
            if (res.error) throw res.error;
            if (!res.data || !res.data.length) throw noRowsError();
            db.categories = db.categories.filter(function (x) { return x.id !== c.id; });
            toast(t('deleted'));
            render(true);
        } catch (err) {
            console.error('Deleting category failed:', err);
            toast(dbErrorMessage(err), 'err');
        } finally {
            busy['dc' + c.id] = false;
        }
    }

    /* ---------------------------------------------------------
       Admin: Settings
    --------------------------------------------------------- */
    var slideImg = '';
    function viewSettings() {
        var s = S();
        var artOpts = function (sel) { return ART_TYPES.map(function (a) { return '<option value="' + a + '"' + (sel === a ? ' selected' : '') + '>' + ART_LABEL[a] + '</option>'; }).join(''); };
        var cats = db.categories.map(function (c) {
            return '<div class="catrow"><input class="inline-input" value="' + esc(c.name) + '" data-change="catName" data-id="' + esc(c.id) + '" aria-label="Name">' +
                (catalog.catHi ? '<input class="inline-input" lang="hi" value="' + esc(c.hi || '') + '" data-change="catHi" data-id="' + esc(c.id) + '" aria-label="हिंदी">' : '') +
                '<select class="inline-input" data-change="catArt" data-id="' + esc(c.id) + '" aria-label="' + esc(t('picture')) + '">' + artOpts(c.art) + '</select>' +
                '<button type="button" class="btn danger sm" data-act="delCat" data-id="' + esc(c.id) + '">' + icon('trash') + t('delete') + '</button></div>';
        }).join('');
        var slides = db.slides.map(function (x, i) {
            var th = x.img ? '<img class="cover" src="' + esc(x.img) + '" alt="">' : '<img src="' + esc(artURI(x.art || 'sofa', x.artColor || '#D9A66B', false)) + '" alt="">';
            return '<div class="srow"><div class="sw" style="background:' + esc(x.bg || '#1E2A4A') + '">' + th + '</div><div><b>' + esc(tok(x.title)) + '</b><div class="muted" style="font-size:.9rem">' + esc(tok(x.hi || '')) + '</div></div>' +
                '<div class="btns"><button type="button" class="btn ghost sm" data-act="editSlide" data-id="' + i + '">' + icon('edit') + t('edit') + '</button><button type="button" class="btn danger sm" data-act="delSlide" data-id="' + i + '">' + icon('trash') + t('delete') + '</button></div></div>';
        }).join('');
        var f = function (id, name, label, val, type, extra) {
            return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" name="' + name + '" type="' + (type || 'text') + '" value="' + esc(val) + '" ' + (extra || '') + '></div>';
        };
        var dbPanel = '<section class="panel"><h2>' + t('dbTitle') + '</h2><p class="muted" style="margin-bottom:12px">' + t('dbHelp') + '</p>' +
            (dbSession
                ? '<p style="margin-bottom:12px">' + icon('check') + ' ' + esc(t('dbSignedInAs', { email: (dbSession.user && dbSession.user.email) || '' })) + '</p><button type="button" class="btn ghost" data-act="dbLogout">' + t('dbSignOut') + '</button>'
                : '<p style="margin-bottom:12px">' + icon('lock') + ' ' + t('dbNotSignedIn') + '</p><button type="button" class="btn gold" data-act="dbLogin">' + t('dbSignIn') + '</button>') +
            '</section>';
        return adminHead(t('settings')) +
            (s.pw === hashPw(DEFAULT_PASSWORD) ? '<div class="notice bad"><span>' + icon('lock') + ' ' + t('defaultPwWarn') + '</span></div>' : '') +
            dbPanel +
            '<form class="panel" data-form="shop"><h2>' + t('shopDetails') + '</h2>' +
            '<div class="two">' + f('s-name', 'shopName', t('shopName'), s.shopName) + f('s-phone', 'phone', t('phone'), s.phone, 'tel', 'inputmode="tel"') + '</div>' +
            '<div class="two">' + f('s-wa', 'whatsapp', 'WhatsApp', s.whatsapp, 'tel', 'inputmode="tel"') + f('s-mail', 'email', t('email'), s.email, 'email') + '</div>' +
            f('s-addr', 'address', t('address'), s.address) + f('s-hours', 'hours', t('hours'), s.hours) +
            '<div class="field"><label for="s-about">' + t('aboutEn') + '</label><textarea id="s-about" name="about">' + esc(s.about) + '</textarea></div>' +
            '<div class="field"><label for="s-abouthi">' + t('aboutHi') + '</label><textarea id="s-abouthi" name="aboutHi" lang="hi">' + esc(s.aboutHi) + '</textarea></div>' +
            '<button class="btn primary" type="submit">' + t('save') + '</button></form>' +

            '<form class="panel" data-form="pay"><h2>' + t('payAndOffer') + '</h2>' +
            '<div class="two">' + f('s-upi', 'upi', t('upiId'), s.upi, 'text', 'placeholder="name@bank" autocapitalize="none"') + f('s-upin', 'upiName', t('upiName'), s.upiName) + '</div>' +
            '<div class="field"><label for="s-bank">' + t('bankText') + '</label><textarea id="s-bank" name="bank">' + esc(s.bank) + '</textarea></div>' +
            '<label class="check"><input type="checkbox" name="offerOn"' + (s.offerOn ? ' checked' : '') + '>' + t('offerOn') + '</label>' +
            '<div class="two">' + f('s-omin', 'offerMin', t('offerMin'), s.offerMin, 'number', 'min="0" inputmode="numeric"') + f('s-opct', 'offerPct', t('offerPct'), s.offerPct, 'number', 'min="0" max="90" inputmode="numeric"') + '</div>' +
            '<button class="btn primary" type="submit">' + t('save') + '</button></form>' +

            '<section class="panel"><h2>' + t('catManage') + '</h2>' + cats +
            (catalog.catHi || !db.categories.length ? '' : '<p class="muted" style="margin-top:8px;font-size:.9rem">' + t('catHiNote') + '</p>') +
            '<form data-form="addcat" style="margin-top:12px" class="catrow" novalidate><input class="inline-input" name="name" placeholder="Name" aria-label="Name" maxlength="120" required>' +
            (catalog.catHi ? '<input class="inline-input" name="hi" lang="hi" placeholder="हिंदी" aria-label="हिंदी">' : '') +
            '<select class="inline-input" name="art" aria-label="' + esc(t('picture')) + '">' + artOpts('sofa') + '</select><button class="btn gold sm" type="submit">' + icon('plus') + t('addCat') + '</button></form></section>' +

            '<section class="panel"><h2>' + t('slides') + '</h2>' + slides + '<div style="margin-top:12px"><button type="button" class="btn gold" data-act="addSlide">' + icon('plus') + t('addSlide') + '</button></div></section>' +

            '<form class="panel" data-form="pw"><h2>' + t('changePw') + '</h2>' +
            '<div class="field"><label for="p-cur">' + t('curPw') + '</label><input id="p-cur" name="cur" type="password" autocomplete="current-password"></div>' +
            '<div class="two"><div class="field"><label for="p-new">' + t('newPw') + '</label><input id="p-new" name="nw" type="password" autocomplete="new-password"></div>' +
            '<div class="field"><label for="p-cf">' + t('confPw') + '</label><input id="p-cf" name="cf" type="password" autocomplete="new-password"></div></div>' +
            '<div class="err" id="pwErr" style="color:var(--danger);margin-bottom:8px"></div><button class="btn primary" type="submit">' + t('changePw') + '</button></form>' +

            '<section class="panel"><h2>' + t('backup') + '</h2><p class="muted" style="margin-bottom:12px">' + t('backupNote') + '</p><div class="btn-row">' +
            '<button type="button" class="btn ghost" data-act="backup">' + icon('download') + t('downloadBackup') + '</button>' +
            '<button type="button" class="btn ghost" data-act="pickRestore">' + t('restoreBackup') + '</button><input type="file" id="restoreInput" accept="application/json,.json" hidden data-change="restore">' +
            '<button type="button" class="btn danger" data-act="resetData">' + t('resetData') + '</button></div></section>';
    }
    function openSlideForm(i) {
        var x = i === '' || i == null ? null : db.slides[i];
        slideImg = x ? (x.img || '') : '';
        var bgs = [['#1E2A4A', 'Indigo'], ['#5A3822', 'Teak'], ['#24493A', 'Forest'], ['#3F2A5E', 'Plum'], ['#2F3B45', 'Slate']];
        var bgNow = x ? x.bg : '#1E2A4A';
        var artNow = x ? (x.art || 'sofa') : 'sofa';
        openModal('<form class="mform" data-form="slide" data-id="' + (x ? i : '') + '" novalidate><div class="mhead"><h2>' + t(x ? 'editSlide' : 'addSlide') + '</h2><button type="button" class="icon-btn dark" data-act="closeModal" aria-label="' + esc(t('close')) + '">' + icon('close') + '</button></div><div class="mbody">' +
            '<div class="field"><label for="l-t">' + t('slideTitle') + ' *</label><input id="l-t" name="title" required value="' + esc(x ? x.title : '') + '"></div>' +
            '<div class="field"><label for="l-h">' + t('slideTitleHi') + '</label><input id="l-h" name="hi" lang="hi" value="' + esc(x ? x.hi : '') + '"></div>' +
            '<div class="field"><label for="l-s">' + t('slideSub') + '</label><input id="l-s" name="sub" value="' + esc(x ? x.sub : '') + '"></div>' +
            '<div class="field"><label for="l-sh">' + t('slideSubHi') + '</label><input id="l-sh" name="subHi" lang="hi" value="' + esc(x ? x.subHi : '') + '"></div>' +
            '<div class="two"><div class="field"><label for="l-bg">' + t('bgColor') + '</label><select id="l-bg" name="bg">' + bgs.map(function (b) { return '<option value="' + b[0] + '"' + (bgNow === b[0] ? ' selected' : '') + '>' + b[1] + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label for="l-c">' + t('opens') + '</label><select id="l-c" name="cat"><option value="">' + t('allProducts') + '</option>' + db.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (x && getCat(x.cat) && getCat(x.cat).id === c.id ? ' selected' : '') + '>' + esc(cName(c)) + '</option>'; }).join('') + '</select></div></div>' +
            '<div class="field"><label for="l-a">' + t('useIllustration') + '</label><select id="l-a" name="art">' + ART_TYPES.map(function (a) { return '<option value="' + a + '"' + (artNow === a ? ' selected' : '') + '>' + ART_LABEL[a] + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><span class="lbl">' + t('photo') + '</span><div class="photos" id="slidePrev"></div><div class="btn-row"><button type="button" class="btn ghost" data-act="pickSlideImg">' + icon('plus') + t('addPhotos') + '</button></div>' +
            '<input type="file" id="slideInput" accept="image/*" hidden data-change="slideimg"></div>' +
            '<div class="err" id="formErr" style="color:var(--danger)"></div></div><div class="mfoot"><button class="btn primary block" type="submit">' + t('save') + '</button></div></form>');
        renderSlidePrev();
    }
    function renderSlidePrev() {
        var el = $('#slidePrev'); if (!el) return;
        el.innerHTML = slideImg ? '<div class="ph"><img src="' + esc(slideImg) + '" alt=""><button type="button" data-act="rmSlideImg" aria-label="' + esc(t('remove')) + '">×</button></div>' : '';
    }
    function saveSlide(f) {
        var fd = new FormData(f), i = f.dataset.id;
        var title = String(fd.get('title') || '').trim();
        if (!title) { $('#formErr').textContent = t('fillRequired'); return; }
        var data = {
            title: title, hi: String(fd.get('hi') || '').trim(), sub: String(fd.get('sub') || '').trim(), subHi: String(fd.get('subHi') || '').trim(),
            bg: String(fd.get('bg')), art: String(fd.get('art')), cat: String(fd.get('cat') || ''), img: slideImg
        };
        if (i !== '' && db.slides[i]) { var old = db.slides[i]; data.id = old.id; data.artColor = old.artColor; db.slides[i] = Object.assign({}, old, data); }
        else { data.id = uid('s'); data.artColor = '#D9A66B'; db.slides.push(data); }
        if (save()) { toast(t('saved')); closeModal(); }
        render(true);
    }

    /* ---------------------------------------------------------
       Static text (header, bottom bar, etc.)
    --------------------------------------------------------- */
    function applyStatic() {
        document.documentElement.lang = lang;
        $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
        $$('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.dataset.i18nPh); });
        $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    }
    function setLang(l) {
        lang = l;
        try { localStorage.setItem(LS.lang, l); } catch (e) { }
        applyStatic(); renderCart(); render(true);
        var m = $('#modal'); if (m.classList.contains('open')) { /* keep current modal text until reopened */ }
    }

    /* ---------------------------------------------------------
       Events
    --------------------------------------------------------- */
    var actions = {
        view: function (el) { openDetail(el.dataset.id); },
        add: function (el) { addToCart(el.dataset.id, 1); },
        thumb: function (el) {
            var i = +el.dataset.id; $('#dMain').src = detail.imgs[i];
            $$('.thumbs button').forEach(function (b, k) { b.classList.toggle('on', k === i); });
        },
        dq: function (el) {
            var p = getP(detail.id); if (!p) return;
            detail.qty = Math.max(1, Math.min(p.stock, detail.qty + (+el.dataset.id)));
            $('#dQty').textContent = detail.qty;
        },
        dAdd: function () { if (addToCart(detail.id, detail.qty)) closeModal(); },
        dBuy: function () { if (addToCart(detail.id, detail.qty, true)) { openCheckout(); } },
        cq: function (el) {
            var c = cart.filter(function (x) { return x.id === normPid(el.dataset.id); })[0], p = getP(el.dataset.id); if (!c || !p) return;
            var d = +el.dataset.d;
            if (c.qty + d < 1) return;
            if (c.qty + d > p.stock) { toast(t('onlyLeft', { n: p.stock }), 'err'); return; }
            c.qty += d; saveCart(); renderCart();
        },
        crm: function (el) { var k = normPid(el.dataset.id); cart = cart.filter(function (x) { return x.id !== k; }); saveCart(); renderCart(); },
        openCart: openCart, closeCart: closeCart,
        checkout: function () { openCheckout(); },
        openMenu: openMenu, closeAll: closeAll, closeModal: closeModal,
        slide: function (el) { goSlide(+el.dataset.id); },
        slidePrev: function () { var e = $('#slides'); goSlide(Math.round(e.scrollLeft / e.clientWidth) - 1); },
        slideNext: function () { var e = $('#slides'); goSlide(Math.round(e.scrollLeft / e.clientWidth) + 1); },
        copy: function (el) {
            var v = el.dataset.id;
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(function () { toast(t('copied')); }, function () { toast(v); });
            else toast(v);
        },
        adminBtn: function () { closeMenu(); if (isAdmin()) location.hash = '#/admin/report'; else { pendingRoute = null; openLogin(); } },
        logout: logout,
        togglePw: function (el) {
            var i = el.parentNode.querySelector('input'); if (!i) return;
            var show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.textContent = t(show ? 'hide' : 'show');
        },
        retryCatalog: async function () {
            catalog.status = 'loading'; render(true);
            await loadSupabaseCatalog();
            render(true);
        },
        dbLogin: function () { openDbLogin(); },
        dbLogout: function () { dbLogout(); },
        addProduct: async function () {
            if (!(await requireDb({ then: function () { openProductForm(''); } }))) return;
            openProductForm('');
        },
        editProduct: async function (el) {
            var id = el.dataset.id;
            if (!(await requireDb({ then: function () { openProductForm(id); } }))) return;
            openProductForm(id);
        },
        delProduct: function (el) { deleteProduct(el.dataset.id); },
        pickPhotos: function () { $('#photoInput').click(); },
        rmPhoto: function (el) { formImgs.splice(+el.dataset.id, 1); renderPhotoPrev(); },
        pickSlideImg: function () { $('#slideInput').click(); },
        rmSlideImg: function () { slideImg = ''; renderSlidePrev(); },
        addSlide: function () { openSlideForm(''); },
        editSlide: function (el) { openSlideForm(+el.dataset.id); },
        delSlide: function (el) { if (!confirm(t('deleteSlide'))) return; db.slides.splice(+el.dataset.id, 1); if (save()) toast(t('deleted')); render(true); },
        delCat: function (el) { deleteCategory(el.dataset.id); },
        exportOrders: function () {
            var rows = [['Order', 'Date', 'Name', 'Phone', 'Address', 'Items', 'Subtotal', 'Discount', 'Total', 'Payment', 'Status']];
            db.orders.forEach(function (o) {
                rows.push([o.id, new Date(o.date).toLocaleString('en-IN'), o.customer.name, o.customer.phone, o.customer.address,
                o.items.map(function (i) { return i.name + ' x' + i.qty; }).join('; '), o.subtotal, o.discount, o.total, PAY_NAME[o.pay] || o.pay, o.status]);
            });
            download('orders.csv', csv(rows), 'text/csv');
        },
        exportCustomers: function () {
            var rows = [['Name', 'Phone', 'Address', 'Orders', 'Total spent', 'Last order']];
            customerList().forEach(function (c) { rows.push([c.name, c.phone, c.address, c.orders, c.spent, new Date(c.last).toLocaleDateString('en-IN')]); });
            download('customers.csv', csv(rows), 'text/csv');
        },
        backup: function () { download('shop-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(localSnapshot()), 'application/json'); },
        pickRestore: function () { $('#restoreInput').click(); },
        resetData: function () {
            if (!confirm(t('confirmReset'))) return;
            var fresh = sampleData();
            db.settings = fresh.settings; db.slides = fresh.slides; db.orders = []; db.seq = fresh.seq;
            save(); renderCart(); toast(t('saved')); render(true);
        }
    };
    document.addEventListener('click', function (e) {
        var langBtn = e.target.closest('[data-lang]');
        if (langBtn) { setLang(langBtn.dataset.lang); return; }
        var el = e.target.closest('[data-act]');
        if (el) {
            var fn = actions[el.dataset.act];
            if (fn) {
                if (el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href').charAt(0) === '#') { fn(el); return; }
                e.preventDefault(); fn(el);
            }
            return;
        }
        if (e.target.closest('#sidebar a') || e.target.closest('#sidebar .nav-item')) closeMenu();
        if (e.target === $('#modal')) closeModal();
    });

    var forms = {
        order: placeOrder, login: doLogin, dblogin: doDbLogin, product: saveProduct, slide: saveSlide,
        enquiry: function (f) {
            var fd = new FormData(f), name = String(fd.get('name') || '').trim(), msg = String(fd.get('msg') || '').trim();
            if (!msg) return;
            var text = (name ? name + ': ' : '') + msg, link = waLink(text);
            if (link) window.open(link, '_blank', 'noopener');
            else if (S().email) location.href = 'mailto:' + S().email + '?subject=' + encodeURIComponent('Enquiry') + '&body=' + encodeURIComponent(text);
            else toast(t('msgFail'), 'err');
        },
        shop: function (f) {
            var fd = new FormData(f), s = S();
            ['shopName', 'phone', 'whatsapp', 'email', 'address', 'hours', 'about', 'aboutHi'].forEach(function (k) { s[k] = String(fd.get(k) || '').trim(); });
            if (!s.shopName) s.shopName = 'Shree Sawaliya Furniture';
            if (save()) toast(t('saved')); render(true);
        },
        pay: function (f) {
            var fd = new FormData(f), s = S();
            s.upi = String(fd.get('upi') || '').trim(); s.upiName = String(fd.get('upiName') || '').trim(); s.bank = String(fd.get('bank') || '').trim();
            s.offerOn = !!fd.get('offerOn'); s.offerMin = Math.max(0, Math.round(num(fd.get('offerMin')))); s.offerPct = Math.min(90, Math.max(0, Math.round(num(fd.get('offerPct')))));
            if (save()) toast(t('saved')); render(true); renderCart();
        },
        addcat: addCategory,
        pw: function (f) {
            var fd = new FormData(f), err = $('#pwErr'), cur2 = String(fd.get('cur')), nw = String(fd.get('nw')), cf = String(fd.get('cf'));
            if (hashPw(cur2) !== S().pw) { err.textContent = t('wrongPw'); return; }
            if (nw.length < 6) { err.textContent = t('pwShort'); return; }
            if (nw !== cf) { err.textContent = t('pwMismatch'); return; }
            S().pw = hashPw(nw); if (save()) toast(t('pwChanged')); render(true);
        }
    };
    document.addEventListener('submit', function (e) {
        var f = e.target;
        if (f.id === 'searchForm') {
            e.preventDefault();
            var q = $('#searchInput').value.trim();
            closeAll();
            location.hash = '#/products' + (q ? '?q=' + encodeURIComponent(q) : '');
            return;
        }
        var h = f.dataset && forms[f.dataset.form];
        if (h) { e.preventDefault(); h(f); }
    });

    var changes = {
        sort: function (el) {
            var p = new URLSearchParams(location.hash.split('?')[1] || '');
            if (el.value) p.set('sort', el.value); else p.delete('sort');
            location.hash = '#/products' + (p.toString() ? '?' + p.toString() : '');
        },
        price: function (el) { saveInlineField(el, 'price'); },
        stockq: function (el) { saveInlineField(el, 'stock'); },
        ostatus: function (el) { setOrderStatus(el.dataset.id, el.value); },
        catName: function (el) { saveCategoryField(el, 'name'); },
        catHi: function (el) { saveCategoryField(el, 'hi'); },
        catArt: function (el) { saveCategoryField(el, 'art'); },
        photos: function (el) {
            var files = Array.prototype.slice.call(el.files || [], 0, Math.max(0, 4 - formImgs.length));
            Promise.all(files.map(function (f) { return fileToDataURL(f, 900, 0.78); })).then(function (urls) {
                formImgs = formImgs.concat(urls).slice(0, 4); renderPhotoPrev(); el.value = '';
            }, function () { toast(t('badFile'), 'err'); });
        },
        slideimg: function (el) {
            var f = el.files && el.files[0]; if (!f) return;
            fileToDataURL(f, 1200, 0.8).then(function (u) { slideImg = u; renderSlidePrev(); el.value = ''; }, function () { toast(t('badFile'), 'err'); });
        },
        restore: function (el) {
            var f = el.files && el.files[0]; if (!f) return;
            var fr = new FileReader();
            fr.onload = function () {
                try {
                    var d = JSON.parse(fr.result);
                    if (!d || d.v !== 1 || !d.settings || !Array.isArray(d.slides)) throw 0;
                    /* Only local data is restored. The catalogue always comes from the database. */
                    db.settings = d.settings; db.slides = d.slides;
                    db.orders = Array.isArray(d.orders) ? d.orders : [];
                    db.seq = d.seq || db.seq;
                    if (save()) toast(t('restored')); renderCart(); render(true);
                } catch (x) { toast(t('badFile'), 'err'); }
            };
            fr.readAsText(f); el.value = '';
        },
        custq: function (el) { replaceQuery(el.value); },
        prodq: function (el) { replaceQuery(el.value); }
    };
    function replaceQuery(v) {
        var base = location.hash.split('?')[0];
        history.replaceState(null, '', base + (v.trim() ? '?q=' + encodeURIComponent(v.trim()) : ''));
        var inp = document.activeElement, pos = inp && inp.selectionStart;
        var id = inp && inp.dataset && inp.dataset.change;
        render(true);
        var again = id && $('[data-change="' + id + '"]');
        if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) { } }
    }
    document.addEventListener('change', function (e) {
        var el = e.target, k = el.dataset && el.dataset.change;
        if (k && changes[k] && k !== 'custq' && k !== 'prodq') changes[k](el);
    });
    /* live typing for the two admin search boxes and the top search bar */
    document.addEventListener('input', function (e) {
        var el = e.target, k = el.dataset && el.dataset.change;
        if (k === 'custq' || k === 'prodq') { clearTimeout(el._t); el._t = setTimeout(function () { changes[k](el); }, 250); }
        if (el.id === 'searchInput' && cur.key === 'products') {
            clearTimeout(el._t);
            el._t = setTimeout(function () {
                var p = new URLSearchParams(location.hash.split('?')[1] || ''), v = el.value.trim();
                if (v) p.set('q', v); else p.delete('q');
                history.replaceState(null, '', '#/products' + (p.toString() ? '?' + p.toString() : ''));
                render(true);
                var s = $('#searchInput'); if (s) { s.focus(); }
            }, 300);
        }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if ($('#modal').classList.contains('open')) closeModal();
            else if ($('#cartDrawer').classList.contains('open') || $('#sidebar').classList.contains('open')) closeDrawers();
        }
    });
    /* A broken product image falls back to the drawing stored in data-fb. */
    document.addEventListener('error', function (e) {
        var im = e.target;
        if (im && im.tagName === 'IMG' && im.dataset && im.dataset.fb && !im.dataset.failed) {
            im.dataset.failed = '1';
            im.src = im.dataset.fb;
        }
    }, true);
    window.addEventListener('hashchange', function () { closeAll(); render(false); });
    window.addEventListener('resize', syncLock);
    window.addEventListener('storage', function (e) {
        if (e.key === LS.data) {
            var prods = db.products, cats = db.categories;
            db = loadDB(); db.products = prods; db.categories = cats;
            render(true); renderCart();
        }
    });
    /* Keeps dbSession current if Supabase refreshes or ends the session. Registered once. */
    if (furnitureDB && furnitureDB.auth && typeof furnitureDB.auth.onAuthStateChange === 'function') {
        furnitureDB.auth.onAuthStateChange(function (event, session) { dbSession = session || null; });
    }

    /* ---------------------------------------------------------
       Start
    --------------------------------------------------------- */
    async function init() {
        $$('[data-icon]').forEach(function (el) {
            el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
        });

        document.body.classList.toggle('is-admin', isAdmin());

        applyStatic();

        if (!location.hash) {
            history.replaceState(null, '', '#/home');
        }

        /* Show the page frame with a loading message while the catalogue loads. */
        $('#view').innerHTML = '<div class="empty"><h3>' + t('loading') + '</h3></div>';
        renderChrome(); renderNav(); renderBottomNav(); renderFooter();

        try {
            await refreshSession();
            await loadSupabaseCatalog();
        } catch (error) {
            console.error('Could not load the catalogue:', error);
            catalog.status = 'error';
            catalog.error = dbErrorMessage(error);
        }

        render(false);
        renderCart();
        if (cartAdjusted) { cartAdjusted = false; toast(t('cartUpdated'), 'err'); }
    }

    init();

})();
