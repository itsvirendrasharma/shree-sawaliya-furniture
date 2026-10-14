/* ==========================================================
   Shree Sawaliya Furniture — script.js
   Single-page shop: storefront, cart, checkout, admin panel.
   All data is saved in this browser (localStorage).
   ========================================================== */

   
/* Supabase client */
const SUPABASE_URL =
  "https://tvzmbuhgfywpvfxjwhlc.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_7Hpx6z7dscR9IPhYmkdWzQ_ZZulvMFA";

const furnitureDB = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


(function () {
    'use strict';

    /* ---------------------------------------------------------
       Basics
    --------------------------------------------------------- */
    var LS = { data: 'ssf_data_v1', cart: 'ssf_cart_v1', lang: 'ssf_lang_v1' };
    var DEFAULT_PASSWORD = 'admin123';   // change it after first login (Settings > Change password)

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

    /* Simple string hash (cyrb53). Only a light lock — see note in README message. */
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
            saveFail: 'Could not save. Storage is full — use fewer or smaller photos.',
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
            backup: 'Backup and reset', backupNote: 'All shop data is saved in this browser. Download a backup regularly.',
            downloadBackup: 'Download backup', restoreBackup: 'Restore backup', resetData: 'Reset to sample data',
            confirmReset: 'Erase everything and restore sample data?', restored: 'Backup restored',
            badFile: 'That file is not a valid backup.', aboutEn: 'About text (English)', aboutHi: 'About text (Hindi)',
            deleteSlide: 'Delete this banner?', stockShort: 'Stock'
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
            saveFail: 'सेव नहीं हो सका। स्टोरेज भर गया है — कम या छोटी फ़ोटो रखें।',
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
            backup: 'बैकअप और रीसेट', backupNote: 'दुकान का सारा डेटा इसी ब्राउज़र में सेव है। नियमित बैकअप डाउनलोड करें।',
            downloadBackup: 'बैकअप डाउनलोड करें', restoreBackup: 'बैकअप रीस्टोर करें', resetData: 'सैंपल डेटा पर रीसेट करें',
            confirmReset: 'सब कुछ मिटाकर सैंपल डेटा वापस लाना है?', restored: 'बैकअप रीस्टोर हो गया',
            badFile: 'यह फ़ाइल सही बैकअप नहीं है।', aboutEn: 'हमारे बारे में (अंग्रेज़ी)', aboutHi: 'हमारे बारे में (हिंदी)',
            deleteSlide: 'क्या यह बैनर हटाना है?', stockShort: 'स्टॉक'
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
       Furniture pictures (drawn in SVG, used until the admin uploads photos)
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

    /* ---------------------------------------------------------
       Data (sample shop — admin can change everything)
    --------------------------------------------------------- */
    function sampleData() {
        var cats = [
            { id: 'bed', name: 'Bed', hi: 'बेड', art: 'bed' },
            { id: 'sofa', name: 'Sofa', hi: 'सोफ़ा', art: 'sofa' },
            { id: 'chair', name: 'Chair', hi: 'कुर्सी', art: 'chair' },
            { id: 'table', name: 'Table', hi: 'टेबल', art: 'table' },
            { id: 'dining', name: 'Dining set', hi: 'डाइनिंग सेट', art: 'dining' },
            { id: 'wardrobe', name: 'Wardrobe', hi: 'अलमारी', art: 'wardrobe' },
            { id: 'shelf', name: 'Shelves', hi: 'शेल्फ़', art: 'shelf' }
        ];
        function P(id, name, hi, cat, price, mrp, stock, desc, descHi, feat) {
            return { id: id, name: name, hi: hi, cat: cat, price: price, mrp: mrp, stock: stock, desc: desc, descHi: descHi, imgs: [], featured: !!feat };
        }
        var products = [
            P('p01', '3-Seater Fabric Sofa', '3 सीटर फ़ैब्रिक सोफ़ा', 'sofa', 24900, 29900, 6, 'Soft cushioned seats with a sturdy wooden frame.\nSize: 3 seats.', 'मुलायम कुशन वाली सीटें और मज़बूत लकड़ी का फ़्रेम।\nआकार: 3 सीट।', 1),
            P('p02', 'Sheesham King Size Bed', 'शीशम किंग साइज़ बेड', 'bed', 38500, 45000, 4, 'Solid wood king size bed with a carved headboard.\nSize: 6 x 6.5 ft.', 'नक्काशीदार हेडबोर्ड वाला मज़बूत लकड़ी का किंग साइज़ बेड।\nआकार: 6 x 6.5 फ़ीट।', 1),
            P('p03', '2-Seater Sofa', '2 सीटर सोफ़ा', 'sofa', 20000, 0, 8, 'Compact two seater sofa for small living rooms.', 'छोटे कमरों के लिए कॉम्पैक्ट 2 सीटर सोफ़ा।', 1),
            P('p04', '6-Seater Dining Set', '6 सीटर डाइनिंग सेट', 'dining', 42000, 48000, 3, 'Dining table with six cushioned chairs.', 'छह कुशन वाली कुर्सियों के साथ डाइनिंग टेबल।', 1),
            P('p05', 'L-Shape Corner Sofa', 'एल-शेप कॉर्नर सोफ़ा', 'sofa', 56000, 64000, 2, 'Large corner sofa that seats five or six people.', 'पाँच-छह लोगों के बैठने लायक बड़ा कॉर्नर सोफ़ा।', 1),
            P('p06', '3-Door Wardrobe', '3 दरवाज़े की अलमारी', 'wardrobe', 31000, 35000, 5, 'Three door wardrobe with hanging space and shelves.', 'कपड़े टाँगने की जगह और शेल्फ़ वाली 3 दरवाज़ों की अलमारी।', 1),
            P('p07', 'Storage Double Bed', 'स्टोरेज डबल बेड', 'bed', 27900, 32000, 5, 'Double bed with a large storage box under the mattress.', 'गद्दे के नीचे बड़े स्टोरेज बॉक्स वाला डबल बेड।', 1),
            P('p08', 'Cushioned Dining Chair', 'कुशन वाली डाइनिंग चेयर', 'chair', 3200, 3800, 20, 'Wooden dining chair with a soft seat.', 'नरम सीट वाली लकड़ी की डाइनिंग चेयर।', 0),
            P('p09', 'Office Chair', 'ऑफ़िस चेयर', 'chair', 6800, 7900, 12, 'Comfortable chair with back support and height adjustment.', 'पीठ के सहारे और ऊँचाई एडजस्ट करने वाली आरामदायक कुर्सी।', 0),
            P('p10', 'Wooden Armchair', 'लकड़ी की आरामकुर्सी', 'chair', 5400, 0, 9, 'Classic armchair for the living room or balcony.', 'बैठक या बालकनी के लिए क्लासिक आरामकुर्सी।', 0),
            P('p11', 'Coffee Table', 'कॉफ़ी टेबल', 'table', 7500, 8800, 10, 'Low centre table with a wide top.', 'चौड़े टॉप वाली नीची सेंटर टेबल।', 0),
            P('p12', 'Study Table', 'स्टडी टेबल', 'table', 8900, 0, 7, 'Study table with a roomy desktop.', 'बड़े डेस्कटॉप वाली स्टडी टेबल।', 0),
            P('p13', '4-Seater Dining Set', '4 सीटर डाइनिंग सेट', 'dining', 26500, 30000, 4, 'Dining table with four chairs for small families.', 'छोटे परिवार के लिए चार कुर्सियों वाला डाइनिंग सेट।', 0),
            P('p14', '2-Door Wardrobe', '2 दरवाज़े की अलमारी', 'wardrobe', 19500, 22000, 6, 'Two door wardrobe with shelves and a hanging rod.', 'शेल्फ़ और हैंगिंग रॉड वाली 2 दरवाज़ों की अलमारी।', 0),
            P('p15', 'Wall Bookshelf', 'बुकशेल्फ़', 'shelf', 6200, 0, 10, 'Open shelf for books, decor and storage.', 'किताबों और सजावट के लिए खुली शेल्फ़।', 0)
        ];
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
            categories: cats, products: products, slides: slides, orders: []
        };
    }

    var db = loadDB();
    function loadDB() {
        try {
            var raw = localStorage.getItem(LS.data);
            if (raw) { var d = JSON.parse(raw); if (d && d.v === 1 && d.products && d.categories && d.settings) return d; }
        } catch (e) { }
        return sampleData();
    }
    function save(quiet) {
        try { localStorage.setItem(LS.data, JSON.stringify(db)); return true; }
        catch (e) { if (!quiet) toast(t('saveFail'), 'err'); return false; }
    }
    var cart = (function () {
        try { var c = JSON.parse(localStorage.getItem(LS.cart) || '[]'); return Array.isArray(c) ? c : []; } catch (e) { return []; }
    })();
    function saveCart() { try { localStorage.setItem(LS.cart, JSON.stringify(cart)); } catch (e) { } }

    function S() { return db.settings; }
    function getP(id) { for (var i = 0; i < db.products.length; i++) if (db.products[i].id === id) return db.products[i]; return null; }
    function getCat(id) { for (var i = 0; i < db.categories.length; i++) if (db.categories[i].id === id) return db.categories[i]; return null; }
    function pName(p) { return pick(p.name, p.hi); }
    function pDesc(p) { return pick(p.desc || '', p.descHi); }
    function cName(c) { return c ? pick(c.name, c.hi) : ''; }
    function pImgs(p) {
        if (p.imgs && p.imgs.length) return p.imgs;
        var c = getCat(p.cat);
        return [artURI((p.art || (c && c.art) || 'sofa'), colorFor(p.id), true)];
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

    /* ---------------------------------------------------------
       Admin session
    --------------------------------------------------------- */
    function isAdmin() { try { return sessionStorage.getItem('ssf_admin') === '1'; } catch (e) { return window.__adm === true; } }
    function setAdmin(v) {
        try { if (v) sessionStorage.setItem('ssf_admin', '1'); else sessionStorage.removeItem('ssf_admin'); } catch (e) { window.__adm = !!v; }
        document.body.classList.toggle('is-admin', !!v);
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
        toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2600);
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
    function cardHTML(p) {
        var c = getCat(p.cat), off = discPct(p), out = p.stock <= 0;
        return '<article class="pcard">' +
            '<button type="button" class="pimg" data-act="view" data-id="' + esc(p.id) + '" aria-label="' + esc(t('viewDetails') + ': ' + pName(p)) + '">' +
            '<img src="' + esc(pImgs(p)[0]) + '" alt="' + esc(pName(p)) + '" loading="lazy" decoding="async">' +
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
        var p = getP(id); if (!p) return;
        detail = { id: id, imgs: pImgs(p), qty: 1 };
        var c = getCat(p.cat), out = p.stock <= 0;
        var stockHTML = out ? '<span class="stock out">' + t('outOfStock') + '</span>'
            : (p.stock <= 3 ? '<span class="stock low">' + t('onlyLeft', { n: p.stock }) + '</span>' : '<span class="stock">' + t('inStock') + '</span>');
        var wa = waLink('Hello, I want to know more about: ' + p.name + ' (' + inr(p.price) + ')');
        openModal(
            '<div class="mhead"><h2>' + esc(cName(c)) + '</h2><button type="button" class="icon-btn dark" data-act="closeModal" aria-label="' + esc(t('close')) + '">' + icon('close') + '</button></div>' +
            '<div class="mbody"><div class="detail"><div class="gallery"><img class="main" id="dMain" src="' + esc(detail.imgs[0]) + '" alt="' + esc(pName(p)) + '">' +
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
        return cart.map(function (c) { return { p: getP(c.id), qty: c.qty }; }).filter(function (l) { return l.p; });
    }
    function totals() {
        var lines = cartLines();
        var subtotal = lines.reduce(function (s, l) { return s + l.p.price * l.qty; }, 0);
        var s = S();
        var discount = (s.offerOn && subtotal > 0 && subtotal >= s.offerMin) ? Math.round(subtotal * s.offerPct / 100) : 0;
        return { lines: lines, subtotal: subtotal, discount: discount, total: subtotal - discount };
    }
    function addToCart(id, qty, quiet) {
        var p = getP(id); if (!p) return false;
        qty = qty || 1;
        if (p.stock <= 0) { toast(t('outOfStock'), 'err'); return false; }
        var line = null; cart.forEach(function (c) { if (c.id === id) line = c; });
        var cur = line ? line.qty : 0;
        if (cur + qty > p.stock) { toast(t('onlyLeft', { n: p.stock }), 'err'); return false; }
        if (line) line.qty += qty; else cart.push({ id: id, qty: qty });
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
                return '<div class="line"><img src="' + esc(pImgs(l.p)[0]) + '" alt=""><div><b>' + esc(pName(l.p)) + '</b><span class="lp">' + inr(l.p.price) + '</span>' +
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
    function placeOrder(f) {
        var fd = new FormData(f);
        var name = String(fd.get('name') || '').trim(), phone = String(fd.get('phone') || '').replace(/[^\d+]/g, ''),
            address = String(fd.get('address') || '').trim(), note = String(fd.get('note') || '').trim(), pay = String(fd.get('pay') || 'cod');
        var digits = phone.replace(/\D/g, '');
        var errs = { name: name ? '' : t('errName'), phone: (digits.length >= 10 && digits.length <= 13) ? '' : t('errPhone'), address: address.length >= 6 ? '' : t('errAddress') };
        var bad = false;
        Object.keys(errs).forEach(function (k) { var e = $('[data-err="' + k + '"]', f); if (e) e.textContent = errs[k]; if (errs[k]) bad = true; });
        if (bad) { var first = $('.err:not(:empty)', f); if (first) first.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); return; }
        var tt = totals(); if (!tt.lines.length) return;
        for (var i = 0; i < tt.lines.length; i++) {
            if (tt.lines[i].qty > tt.lines[i].p.stock) { toast(pName(tt.lines[i].p) + ': ' + t('onlyLeft', { n: tt.lines[i].p.stock }), 'err'); return; }
        }
        db.seq = (db.seq || 1000) + 1;
        var order = {
            id: 'SSF' + db.seq, date: new Date().toISOString(),
            customer: { name: name, phone: phone, address: address, note: note },
            items: tt.lines.map(function (l) { return { id: l.p.id, name: l.p.name, cat: l.p.cat, price: l.p.price, qty: l.qty }; }),
            subtotal: tt.subtotal, discount: tt.discount, total: tt.total, pay: pay, status: 'pending'
        };
        tt.lines.forEach(function (l) { l.p.stock -= l.qty; });
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
            db.categories.map(function (c) { return '<a class="chip' + (active === c.id ? ' on' : '') + '" href="' + href(c.id) + '">' + esc(cName(c)) + '</a>'; }).join('') + '</nav>';
    }
    function perksHTML() {
        return '<div class="perks"><div class="perk">' + icon('tag') + '<div><b>' + t('perk1') + '</b><span>' + t('perk1d') + '</span></div></div>' +
            '<div class="perk">' + icon('card') + '<div><b>' + t('perk2') + '</b><span>' + t('perk2d') + '</span></div></div>' +
            '<div class="perk">' + icon('chat') + '<div><b>' + t('perk3') + '</b><span>' + t('perk3d') + '</span></div></div></div>';
    }
    function viewHome() {
        var list = db.products.filter(function (p) { return p.featured; });
        if (!list.length) list = db.products.slice(0, 8);
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
        var cat = params.get('cat') || '', q = (params.get('q') || '').trim(), sort = params.get('sort') || '';
        var list = db.products.filter(function (p) {
            if (cat && p.cat !== cat) return false;
            if (q) { var hay = (p.name + ' ' + (p.hi || '') + ' ' + (p.desc || '') + ' ' + cName(getCat(p.cat)) + ' ' + ((getCat(p.cat) || {}).name || '')).toLowerCase(); return hay.indexOf(q.toLowerCase()) >= 0; }
            return true;
        });
        if (sort === 'low') list.sort(function (a, b) { return a.price - b.price; });
        else if (sort === 'high') list.sort(function (a, b) { return b.price - a.price; });
        var c = getCat(cat);
        var title = c ? cName(c) : t('products');
        var sortSel = '<label class="sr" style="display:contents"><select data-change="sort" aria-label="' + esc(t('sort')) + '">' +
            [['', 'sortNew'], ['low', 'sortLow'], ['high', 'sortHigh']].map(function (o) { return '<option value="' + o[0] + '"' + (sort === o[0] ? ' selected' : '') + '>' + t(o[1]) + '</option>'; }).join('') + '</select></label>';
        return '<div class="page-head"><div><h1>' + esc(title) + '</h1>' + (q ? '<p>“' + esc(q) + '”</p>' : '') + '</div></div>' +
            chipsHTML(cat, q, sort) +
            '<div class="toolbar"><span class="count">' + t('items', { n: list.length }) + '</span>' + sortSel + '</div>' +
            (list.length ? '<div class="grid">' + list.map(cardHTML).join('') + '</div>' : emptyHTML());
    }
    function viewCategories() {
        return '<div class="page-head"><h1>' + t('categories') + '</h1></div><div class="cat-grid">' + db.categories.map(function (c) {
            var n = db.products.filter(function (p) { return p.cat === c.id; }).length;
            return '<a class="cat-tile" href="#/products?cat=' + encodeURIComponent(c.id) + '"><img src="' + esc(artURI(c.art || 'sofa', colorFor(c.id), true)) + '" alt="" loading="lazy"><div><b>' + esc(cName(c)) + '</b><small>' + t('items', { n: n }) + '</small></div></a>';
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
        if (location.hash.indexOf('admin') >= 0) location.hash = '#/home'; else render(true);
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
            pwWarn + setup +
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
            '<div class="field" style="margin:6px 0 0"><label for="st-' + o.id + '">' + t('status') + '</label><select id="st-' + o.id + '" data-change="ostatus" data-id="' + o.id + '">' + opts + '</select></div>' +
            (wa ? '<a class="btn wa sm" style="justify-self:start" href="' + wa + '" target="_blank" rel="noopener">' + icon('chat') + 'WhatsApp</a>' : '') +
            '</div></details>';
    }
    function setOrderStatus(id, status) {
        var o = null; db.orders.forEach(function (x) { if (x.id === id) o = x; });
        if (!o || o.status === status) return;
        var was = o.status;
        if (status === 'cancelled' && was !== 'cancelled') o.items.forEach(function (i) { var p = getP(i.id); if (p) p.stock += i.qty; });
        if (was === 'cancelled' && status !== 'cancelled') o.items.forEach(function (i) { var p = getP(i.id); if (p) p.stock = Math.max(0, p.stock - i.qty); });
        o.status = status;
        if (save()) toast(t('saved'));
        render(true);
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
            return '<div class="arow"><img src="' + esc(pImgs(p)[0]) + '" alt=""><div class="nm"><b>' + esc(p.name) + '</b><small>' + esc(cName(getCat(p.cat))) + (p.featured ? ' · ★' : '') + '</small></div>' +
                '<div class="edits"><label>' + t('price') + ' (₹)<input class="inline-input" type="number" min="0" inputmode="numeric" value="' + p.price + '" data-change="price" data-id="' + esc(p.id) + '"></label>' +
                '<label>' + t('stock') + '<input class="inline-input" type="number" min="0" inputmode="numeric" value="' + p.stock + '" data-change="stockq" data-id="' + esc(p.id) + '"></label></div>' +
                '<div class="btns"><button type="button" class="btn ghost sm" data-act="editProduct" data-id="' + esc(p.id) + '">' + icon('edit') + t('edit') + '</button>' +
                '<button type="button" class="btn danger sm" data-act="delProduct" data-id="' + esc(p.id) + '" aria-label="' + esc(t('delete')) + '">' + icon('trash') + '<span>' + t('delete') + '</span></button></div></div>';
        }).join('');
        return adminHead(t('manageTitle') + ' (' + db.products.length + ')', '<button type="button" class="btn gold" data-act="addProduct">' + icon('plus') + t('addProduct') + '</button>') +
            '<div class="field"><input type="search" data-change="prodq" placeholder="' + esc(t('filterProducts')) + '" aria-label="' + esc(t('filterProducts')) + '" value="' + esc(q) + '"></div>' +
            (rows || '<div class="empty"><p>' + t('noProducts') + '</p></div>');
    }
    var formImgs = [];
    function renderPhotoPrev() {
        var el = $('#photoPrev'); if (!el) return;
        el.innerHTML = formImgs.map(function (s, i) { return '<div class="ph"><img src="' + esc(s) + '" alt=""><button type="button" data-act="rmPhoto" data-id="' + i + '" aria-label="' + esc(t('remove')) + '">×</button></div>'; }).join('');
        var b = $('#pickBtn'); if (b) b.disabled = formImgs.length >= 4;
    }
    function openProductForm(id) {
        var p = id ? getP(id) : null;
        formImgs = p && p.imgs ? p.imgs.slice() : [];
        if (!db.categories.length) { toast(t('addCat'), 'err'); location.hash = '#/admin/settings'; return; }
        var cats = db.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (p && p.cat === c.id ? ' selected' : '') + '>' + esc(cName(c)) + '</option>'; }).join('');
        openModal('<form class="mform" data-form="product" data-id="' + esc(id || '') + '" novalidate>' +
            '<div class="mhead"><h2>' + t(p ? 'editProduct' : 'addProduct') + '</h2><button type="button" class="icon-btn dark" data-act="closeModal" aria-label="' + esc(t('close')) + '">' + icon('close') + '</button></div>' +
            '<div class="mbody">' +
            '<div class="field"><label for="f-name">' + t('nameEn') + ' *</label><input id="f-name" name="name" required value="' + esc(p ? p.name : '') + '"></div>' +
            '<div class="field"><label for="f-hi">' + t('nameHi') + '</label><input id="f-hi" name="hi" lang="hi" value="' + esc(p ? p.hi : '') + '"></div>' +
            '<div class="field"><label for="f-cat">' + t('category') + '</label><select id="f-cat" name="cat">' + cats + '</select></div>' +
            '<div class="two"><div class="field"><label for="f-price">' + t('price') + ' (₹) *</label><input id="f-price" name="price" type="number" min="1" inputmode="numeric" required value="' + (p ? p.price : '') + '"></div>' +
            '<div class="field"><label for="f-mrp">' + t('mrp') + '</label><input id="f-mrp" name="mrp" type="number" min="0" inputmode="numeric" value="' + (p && p.mrp ? p.mrp : '') + '"></div></div>' +
            '<div class="field"><label for="f-stock">' + t('stock') + '</label><input id="f-stock" name="stock" type="number" min="0" inputmode="numeric" value="' + (p ? p.stock : 1) + '"></div>' +
            '<div class="field"><label for="f-desc">' + t('descEn') + '</label><textarea id="f-desc" name="desc">' + esc(p ? p.desc : '') + '</textarea></div>' +
            '<div class="field"><label for="f-dhi">' + t('descHi') + '</label><textarea id="f-dhi" name="descHi" lang="hi">' + esc(p ? p.descHi : '') + '</textarea></div>' +
            '<div class="field"><span class="lbl">' + t('photos') + '</span><div class="photos" id="photoPrev"></div>' +
            '<button type="button" class="btn ghost" id="pickBtn" data-act="pickPhotos" style="justify-self:start">' + icon('plus') + t('addPhotos') + '</button>' +
            '<input type="file" id="photoInput" accept="image/*" multiple hidden data-change="photos"></div>' +
            '<label class="check"><input type="checkbox" name="featured"' + (p && p.featured ? ' checked' : '') + '>' + t('featured') + '</label>' +
            '<div class="err" id="formErr" style="color:var(--danger)"></div></div>' +
            '<div class="mfoot"><button class="btn primary block" type="submit">' + t('save') + '</button></div></form>');
        renderPhotoPrev();
    }
    function saveProduct(f) {
        var fd = new FormData(f), id = f.dataset.id;
        var name = String(fd.get('name') || '').trim(), price = Math.round(num(fd.get('price')));
        if (!name || price <= 0) { $('#formErr').textContent = t('fillRequired'); return; }
        var p = id ? getP(id) : null;
        var data = {
            name: name, hi: String(fd.get('hi') || '').trim(), cat: String(fd.get('cat')), price: price,
            mrp: Math.max(0, Math.round(num(fd.get('mrp')))), stock: Math.max(0, Math.round(num(fd.get('stock')))),
            desc: String(fd.get('desc') || '').trim(), descHi: String(fd.get('descHi') || '').trim(),
            imgs: formImgs.slice(), featured: !!fd.get('featured')
        };
        if (p) Object.assign(p, data); else { data.id = uid('p'); db.products.unshift(data); }
        if (save()) { toast(t('saved')); closeModal(); }
        render(true);
    }

    /* ---------------------------------------------------------
       Admin: Settings
    --------------------------------------------------------- */
    var slideImg = '';
    function viewSettings() {
        var s = S();
        var artOpts = function (sel) { return ART_TYPES.map(function (a) { return '<option value="' + a + '"' + (sel === a ? ' selected' : '') + '>' + ART_LABEL[a] + '</option>'; }).join(''); };
        var cats = db.categories.map(function (c) {
            return '<div class="catrow"><input class="inline-input" value="' + esc(c.name) + '" data-change="catName" data-id="' + esc(c.id) + '" aria-label="Name"><input class="inline-input" lang="hi" value="' + esc(c.hi || '') + '" data-change="catHi" data-id="' + esc(c.id) + '" aria-label="हिंदी">' +
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
        return adminHead(t('settings')) +
            (s.pw === hashPw(DEFAULT_PASSWORD) ? '<div class="notice bad"><span>' + icon('lock') + ' ' + t('defaultPwWarn') + '</span></div>' : '') +
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
            '<form data-form="addcat" style="margin-top:12px" class="catrow" novalidate><input class="inline-input" name="name" placeholder="Name" aria-label="Name" required><input class="inline-input" name="hi" lang="hi" placeholder="हिंदी" aria-label="हिंदी">' +
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
            '<div class="field"><label for="l-c">' + t('opens') + '</label><select id="l-c" name="cat"><option value="">' + t('allProducts') + '</option>' + db.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (x && x.cat === c.id ? ' selected' : '') + '>' + esc(cName(c)) + '</option>'; }).join('') + '</select></div></div>' +
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
            var c = cart.filter(function (x) { return x.id === el.dataset.id; })[0], p = getP(el.dataset.id); if (!c || !p) return;
            var d = +el.dataset.d;
            if (c.qty + d < 1) return;
            if (c.qty + d > p.stock) { toast(t('onlyLeft', { n: p.stock }), 'err'); return; }
            c.qty += d; saveCart(); renderCart();
        },
        crm: function (el) { cart = cart.filter(function (x) { return x.id !== el.dataset.id; }); saveCart(); renderCart(); },
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
        togglePw: function (el) { var i = $('#a-pw'); var show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.textContent = t(show ? 'hide' : 'show'); },
        addProduct: function () { openProductForm(''); },
        editProduct: function (el) { openProductForm(el.dataset.id); },
        delProduct: function (el) {
            if (!confirm(t('confirmDelete'))) return;
            db.products = db.products.filter(function (p) { return p.id !== el.dataset.id; });
            cart = cart.filter(function (c) { return c.id !== el.dataset.id; }); saveCart(); renderCart();
            if (save()) toast(t('deleted')); render(true);
        },
        pickPhotos: function () { $('#photoInput').click(); },
        rmPhoto: function (el) { formImgs.splice(+el.dataset.id, 1); renderPhotoPrev(); },
        pickSlideImg: function () { $('#slideInput').click(); },
        rmSlideImg: function () { slideImg = ''; renderSlidePrev(); },
        addSlide: function () { openSlideForm(''); },
        editSlide: function (el) { openSlideForm(+el.dataset.id); },
        delSlide: function (el) { if (!confirm(t('deleteSlide'))) return; db.slides.splice(+el.dataset.id, 1); if (save()) toast(t('deleted')); render(true); },
        delCat: function (el) {
            if (db.products.some(function (p) { return p.cat === el.dataset.id; })) { toast(t('catInUse'), 'err'); return; }
            if (!confirm(t('confirmDelete'))) return;
            db.categories = db.categories.filter(function (c) { return c.id !== el.dataset.id; });
            if (save()) toast(t('deleted')); render(true);
        },
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
        backup: function () { download('shop-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(db), 'application/json'); },
        pickRestore: function () { $('#restoreInput').click(); },
        resetData: function () {
            if (!confirm(t('confirmReset'))) return;
            db = sampleData(); cart = []; saveCart(); save(); renderCart(); toast(t('saved')); render(true);
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
        order: placeOrder, login: doLogin, product: saveProduct, slide: saveSlide,
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
        addcat: function (f) {
            var fd = new FormData(f), name = String(fd.get('name') || '').trim(); if (!name) { $('[name=name]', f).focus(); return; }
            db.categories.push({ id: uid('c'), name: name, hi: String(fd.get('hi') || '').trim(), art: String(fd.get('art')) });
            if (save()) toast(t('saved')); render(true);
        },
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
        price: function (el) {
            var p = getP(el.dataset.id), v = Math.round(num(el.value)); if (!p) return;
            if (v <= 0) { el.value = p.price; return; }
            p.price = v; if (save()) toast(t('saved')); renderCart();
        },
        stockq: function (el) {
            var p = getP(el.dataset.id), v = Math.max(0, Math.round(num(el.value))); if (!p) return;
            p.stock = v; el.value = v; if (save()) toast(t('saved'));
        },
        ostatus: function (el) { setOrderStatus(el.dataset.id, el.value); },
        catName: function (el) { var c = getCat(el.dataset.id); if (c && el.value.trim()) { c.name = el.value.trim(); if (save()) toast(t('saved')); } },
        catHi: function (el) { var c = getCat(el.dataset.id); if (c) { c.hi = el.value.trim(); if (save()) toast(t('saved')); } },
        catArt: function (el) { var c = getCat(el.dataset.id); if (c) { c.art = el.value; if (save()) toast(t('saved')); } },
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
                    if (!d || d.v !== 1 || !Array.isArray(d.products) || !Array.isArray(d.categories) || !d.settings || !Array.isArray(d.slides)) throw 0;
                    db = d; if (!Array.isArray(db.orders)) db.orders = [];
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
    window.addEventListener('hashchange', function () { closeAll(); render(false); });
    window.addEventListener('resize', syncLock);
    window.addEventListener('storage', function (e) { if (e.key === LS.data) { db = loadDB(); render(true); renderCart(); } });

    
/* ---------------------------------------------------------
   Load live catalogue from Supabase
--------------------------------------------------------- */
async function loadSupabaseCatalog() {
    const { data: categories, error: catError } =
        await furnitureDB
            .from("categories")
            .select("*")
            .order("name");

    if (catError) throw catError;

    const { data: products, error: prodError } =
        await furnitureDB
            .from("products")
            .select("*");

    if (prodError) throw prodError;

    // Convert database categories into the existing frontend format.
    const categoryRows = (categories || []).map(function (c) {
        return {
            id: String(c.slug || c.id),
            dbId: c.id,
            name: c.name || "",
            hi: c.name_hi || c.hi || "",
            art: c.art || c.slug || "sofa"
        };
    });

    // Convert database products into the existing frontend format.
    const productRows = (products || []).map(function (p) {
        const category = (categories || []).find(function (c) {
            return String(c.id) === String(p.category_id);
        });

        const categorySlug = category
            ? String(category.slug || category.id)
            : String(p.category_slug || p.category || "");

        const images = Array.isArray(p.images)
            ? p.images
            : (p.image_url ? [p.image_url] : []);

        return {
            id: "sb-" + p.id,
            dbId: p.id,
            name: p.name || "",
            hi: p.name_hi || p.hi || "",
            cat: categorySlug,
            price: Number(p.price) || 0,
            mrp: Number(p.mrp) || 0,
            stock: Number(
                p.stock_quantity ?? p.stock ?? 0
            ),
            desc: p.description || p.desc || "",
            descHi: p.description_hi || p.descHi || "",
            imgs: images,
            featured: Boolean(p.featured)
        };
    });

    // Replace sample catalogue data only after successful queries.
    if (categoryRows.length) {
        db.categories = categoryRows;
    }

    if (productRows.length) {
        db.products = productRows;
    }

    console.log("Supabase catalogue loaded", {
        categories: categoryRows.length,
        products: productRows.length
    });
}

    /* ---------------------------------------------------------
       Start
    --------------------------------------------------------- */
   
async function init() {
    $$('[data-icon]').forEach(function (el) {
        el.insertAdjacentHTML(
            'afterbegin',
            icon(el.dataset.icon)
        );
    });

    document.body.classList.toggle(
        'is-admin',
        isAdmin()
    );

    applyStatic();

    if (!location.hash) {
        history.replaceState(null, '', '#/home');
    }

    try {
        await loadSupabaseCatalog();
    } catch (error) {
        console.error(
            "Could not load Supabase catalogue:",
            error
        );

        toast(
            "Could not load live products. Check the console.",
            "err"
        );
    }

    render(false);
    renderCart();
}

init();

})();


