// --- Firebase Configuration ---
const userProvidedFirebaseConfig = {
    apiKey: "AIzaSyARzlfhH_AC0YTxJ5fKvhz_SPDq1r6mWPA",
    authDomain: "migrantopoly.firebaseapp.com",
    projectId: "migrantopoly",
    storageBucket: "migrantopoly.firebasestorage.app",
    messagingSenderId: "649348280586",
    appId: "1:649348280586:web:2bd3be4d2de84c0ea8caf3",
    measurementId: "G-1TMRSC6KL8"
};

// Background music setup
let backgroundMusic = null;
let isMusicPlaying = false;

function initializeBackgroundMusic() {
    backgroundMusic = new Audio('sounds/oxy.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.2; // Set to 20% volume
}

function toggleBackgroundMusic() {
    if (!backgroundMusic) {
        initializeBackgroundMusic();
    }
    
    if (isMusicPlaying) {
        backgroundMusic.pause();
        isMusicPlaying = false;
    } else {
        backgroundMusic.play().catch(e => console.error("Error playing background music:", e));
        isMusicPlaying = true;
    }
}

// Function to play set sound
function playSetSound() {
    const audio = new Audio('sounds/set.mp3');
    audio.play().catch(e => console.error("Error playing set sound:", e));
}

// Function to play crack house sound
function playCrackHouseSound() {
    const audio = new Audio('sounds/crack.mp3');
    audio.play().catch(e => console.error("Error playing crack house sound:", e));
}

// Function to play wives sound
function playWivesSound() {
    const audio = new Audio('sounds/wives.mp3');
    audio.play().catch(e => console.error("Error playing wives sound:", e));
}

// Function to play market sound
function playMarketSound() {
    const audio = new Audio('sounds/market.mp3');
    audio.play().catch(e => console.error("Error playing market sound:", e));
}

// Function to play glug sound
function playGlugSound() {
    const audio = new Audio('sounds/glug.mp3');
    audio.play().catch(e => console.error("Error playing glug sound:", e));
}

// Use global config if available, otherwise fallback to userProvided (or your defaults)
const firebaseConfigToUse = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : userProvidedFirebaseConfig;

const VALID_LOGIN_CODE = 'secret123'; // Change to your desired access code
let loginVerified = true; // Set to true to bypass password requirement

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp, arrayUnion, arrayRemove, runTransaction, writeBatch, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js"; // Analytics can be added if needed

let db, auth, currentUserId = null, localPlayerName = '';
let currentGameId = null;
let unsubscribeGameState = null;
let localGameData = {}; // Local cache of the game state
let difficultyLevel = 1;
let deductionMultiplier = 1;
// let analytics; // Declare analytics if you plan to use it
let onlineUsersUnsub = null;
let presenceDocRef = null;

// --- DOM Elements ---
const onlineSetupScreen = document.getElementById('online-setup-screen');
const gameContainer = document.getElementById('game-container');
const playerNameInput = document.getElementById('player-name-input');
const gameIdInput = document.getElementById('game-id-input');
const createGameButton = document.getElementById('create-game-button');
const joinGameButton = document.getElementById('join-game-button');
const numHumanPlayersSelect = document.getElementById('num-human-players-select');
const numAIPlayersSelect = document.getElementById('num-ai-players-select'); // Added for AI
const difficultySelect = document.getElementById('difficulty-select');
const doublesModeCheckbox = document.getElementById('doubles-mode-checkbox');
const onlineSetupMessage = document.getElementById('online-setup-message');
const gameIdDisplayDiv = document.getElementById('game-id-display');
// Login elements removed - no password required
const generatedGameIdSpan = document.getElementById('generated-game-id');
const localUserIdSpan = document.getElementById('local-user-id');
const onlineUsersListSpan = document.getElementById('online-users-list');

const boardContainer = document.getElementById('board-container');
const playerInfoDiv = document.getElementById('player-info');
const rollDiceButton = document.getElementById('roll-dice-button');
const endTurnButton = document.getElementById('end-turn-button');
const buyPropertyButton = document.getElementById('buy-property-button');
const buyPropertyPriceSpan = document.getElementById('buy-property-price');
const developPropertyButton = document.getElementById('develop-property-button');
const diceFace1Elem = document.getElementById('die-face-1');
const diceFace2Elem = document.getElementById('die-face-2');
const diceTotalDisplayText = document.getElementById('dice-total-display-text');
const currentTurnDisplay = document.getElementById('current-turn-display');
const cardDisplayContainer = document.getElementById('card-display-container');
const cardTypeTitle = document.getElementById('card-type-title');
const cardMessageP = document.getElementById('card-message');
const cardOkButton = document.getElementById('card-ok-button');
const detentionActionsDiv = document.getElementById('detention-actions');
const gameStatusMessageP = document.getElementById('game-status-message');
const gameStatusHistory = document.getElementById('game-status-history');
const MAX_STATUS_HISTORY = 20;

// Login button event listener removed - no password required

function updateGameStatus(message) {
    if (!gameStatusMessageP || !gameStatusHistory) return;
    
    // Update current status
    gameStatusMessageP.textContent = message;
    
    // Add to history
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const entry = document.createElement('div');
    entry.className = 'status-entry';
    entry.innerHTML = `<span class="status-time">[${timeStr}]</span><span class="status-text">${message}</span>`;
    
    // Add new entry at the top instead of bottom
    gameStatusHistory.insertBefore(entry, gameStatusHistory.firstChild);
    
    // Keep only the last MAX_STATUS_HISTORY entries
    while (gameStatusHistory.children.length > MAX_STATUS_HISTORY) {
        gameStatusHistory.removeChild(gameStatusHistory.lastChild);
    }
}
const preGameRollArea = document.getElementById('pre-game-roll-area');
const preGameRollButton = document.getElementById('pre-game-roll-button');
const preGameRollResultsDiv = document.getElementById('pre-game-roll-results');
const developPropertyContainer = document.getElementById('develop-property-container');
const developPropertyNameH3 = document.getElementById('develop-property-name');
const developPropertyOptionsDiv = document.getElementById('develop-property-options');
const closeDevelopButton = document.getElementById('close-develop-button');
const otherActionsContainer = document.getElementById('other-actions-container');
const ukGovCashSpan = document.getElementById('uk-gov-cash');
let onBoardCardDisplayDiv, onBoardCardTypeH4, onBoardCardTextP, onBoardCardOkButton;

const messageModal = document.getElementById('message-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalOkButton = document.getElementById('modal-ok-button');
const moneyFlashDiv = document.getElementById('money-flash');
const rentFlashDiv = document.getElementById('rent-flash');


// --- Game Data Definitions ---
let initialBoardLayout = [ // This layout will be reformatted
    { id: 0, name: "Dole", type: "go" },
    { id: 1, name: "Tent in Field", type: "property", price: 120, rent: [280, 370, 460, 540, 760, 970], color: "brown", groupId: "brown", houseCost: 200 },
    { id: 2, name: "Welfare Card", type: "welfare" },
    { id: 3, name: "Tent in Field", type: "property", price: 130, rent: [280, 360, 450, 540, 750, 950], color: "brown", groupId: "brown", houseCost: 200 },
    { id: 4, name: "Black Market Sales", type: "set_property", price: 100, rent_base: 190, groupId: "special_set" },
    { id: 5, name: "Fake PIP declined", type: "tax", amount: 300 },
    { id: 6, name: "Tesco Cardboard Skip", type: "property", price: 150, rent: [260, 330, 470, 570, 720, 950], color: "light-blue", groupId: "lightblue", houseCost: 300 },
    { id: 7, name: "Tesco Cardboard Skip", type: "property", price: 170, rent: [280, 340, 470, 550, 730, 850], color: "light-blue", groupId: "lightblue", houseCost: 300 },
    { id: 8, name: "Detention Center", type: "detention_visiting", rent: 350 },
    { id: 9, name: "Payout: Job Seeker's", type: "payout", amount: 300 },
    { id: 10, name: "Tesco Cardboard Skip", type: "property", price: 140, rent: [250, 350, 450, 550, 725, 995], color: "light-blue", groupId: "lightblue", houseCost: 300 },
    { id: 11, name: "Council Highrise", type: "property", price: 160, rent: [220, 310, 450, 550, 800, 975], color: "pink", groupId: "pink", houseCost: 250 },
    { id: 12, name: "Forced Marriage", type: "set_property", price: 100, rent_base: 300, groupId: "special_set" },
    { id: 13, name: "Welfare Card", type: "welfare" },
    { id: 14, name: "Council Highrise", type: "property", price: 180, rent: [240, 370, 400, 550, 750, 900], color: "pink", groupId: "pink", houseCost: 350 },
    { id: 15, name: "Council Highrise", type: "property", price: 200, rent: [240, 380, 420, 500, 700, 950], color: "pink", groupId: "pink", houseCost: 350 },
    { id: 16, name: "Crime Spree !!! Arrest", type: "crime_spree", amount: 150 },
    { id: 17, name: "Gypsy Estate", type: "property", price: 220, rent: [280, 320, 450, 570, 775, 925], color: "orange", groupId: "orange", houseCost: 200 },
    { id: 18, name: "Opportunity Card", type: "opportunity" },
    { id: 19, name: "Gypsy Estate", type: "property", price: 240, rent: [270, 360, 390, 500, 725, 945], color: "orange", groupId: "orange", houseCost: 250 },
    { id: 20, name: "Child Wives", type: "set_property", price: 100, rent_base: 190, groupId: "special_set" },
    { id: 21, name: "Fake ID Cards", type: "tax", amount: 300 },
    { id: 22, name: "Gypsy Estate", type: "property", price: 260, rent: [275, 340, 430, 570, 795, 956], color: "orange", groupId: "orange", houseCost: 370 },
    { id: 23, name: "Holiday Inn", type: "property", price: 280, rent: [275, 360, 460, 500, 725, 920], color: "red", groupId: "red", houseCost: 350 },
    { id: 24, name: "Go to Detention Center", type: "go_to_detention" },
    { id: 25, name: "Welfare Card", type: "welfare" },
    { id: 26, name: "Holiday Inn", type: "property", price: 300, rent: [275, 390, 490, 697, 974, 1275], color: "red", groupId: "red", houseCost: 450 },
    { id: 27, name: "Holiday Inn", type: "property", price: 320, rent: [275, 390, 450, 700, 900, 1250], color: "red", groupId: "red", houseCost: 420 },
    { id: 28, name: "I Dont speak English", type: "set_property", price: 100, rent_base: 190, groupId: "special_set" },
    { id: 29, name: "Luxury Flats-A", type: "property", price: 350, rent: [300, 420, 550, 650, 780, 1110], color: "green", groupId: "green", houseCost: 425 },
    { id: 30, name: "Opportunity Card", type: "opportunity" },
    { id: 31, name: "Luxury Flats-B", type: "property", price: 400, rent: [395, 480, 550, 690, 870, 1200], color: "green", groupId: "green", houseCost: 425 },
];
let boardLayout = []; // Will hold the final, re-indexed board layout
const AUTO_TRANSFER_GROUPS = ['lightblue', 'orange', 'pink', 'red'];
const GO_BONUS = 250; // Standard bonus for passing/landing on DOLE
let detentionCenterSpaceId;
const MAX_TENANCIES_BEFORE_PR = 4;
const PR_IS_FIFTH_DEVELOPMENT = true;
// Minimum money AI should have left after purchasing a property
const AI_PURCHASE_MIN_BALANCE = 1000;
const GROUP_SYNERGY_FACTOR = 0.5; // AI can spend more aggressively when owning in the same group
const GROUP_COMPLETION_FACTOR = 0.25; // Even more aggressive if purchase completes a set

function shouldAIBuyProperty(aiPlayerState, landedSpace, gameData, moneyAvailable) {
    if (!landedSpace || !landedSpace.price) return false;

    const propertyPrice = landedSpace.price;
    if (moneyAvailable < propertyPrice) return false;

    let minBalance = AI_PURCHASE_MIN_BALANCE;

    if (landedSpace.groupId) {
        const ownedInGroup = gameData.propertyData.filter(p => p.owner === aiPlayerState.id && p.groupId === landedSpace.groupId).length;
        const totalInGroup = gameData.boardLayout.filter(s => s.groupId === landedSpace.groupId && (s.type === 'property' || s.type === 'set_property')).length;

        if (ownedInGroup > 0) {
            minBalance *= GROUP_SYNERGY_FACTOR;
        }
        if (ownedInGroup === totalInGroup - 1) {
            minBalance *= GROUP_COMPLETION_FACTOR;
        }
    }

    if (moneyAvailable - propertyPrice < minBalance) return false;

    // Require AI to generally have at least £750 total to avoid early bankruptcy
    if (moneyAvailable < 750) return false;

    return true;
}

// Auto-buy feature
let autoBuyEnabled = false;
const autoBuyToggle = document.getElementById('auto-buy-toggle');

if (autoBuyToggle) {
    autoBuyToggle.addEventListener('click', () => {
        autoBuyEnabled = !autoBuyEnabled;
        autoBuyToggle.classList.toggle('active');
        localStorage.setItem('autoBuyEnabled', autoBuyEnabled);
    });

    // Load saved preference
    const savedAutoBuy = localStorage.getItem('autoBuyEnabled');
    if (savedAutoBuy === 'true') {
        autoBuyEnabled = true;
        autoBuyToggle.classList.add('active');
    }
}


const welfareCards = [
    { text: "Passed out in alley, mugged: Pay £120.", action: "pay", amount: 120 },
    { text: "Drunkenly sold your shoes for cash: Collect £60.", action: "collect", amount: 60 },
    { text: "Drunkenly bribed a cop to avoid arrest: Get out of Detention Center free.", action: "getOutOfDetentionFree" },
    { text: "Drunkenly found cash in a gutter: Collect £110.", action: "collect", amount: 110 },
    { text: "Drunkenly tipped bartender with your watch: Pay £70.", action: "pay", amount: 70 },
    { text: "Drunkenly charmed a rich patron: Collect £90.", action: "collect", amount: 90 },
    { text: "Drunkenly crashed a rented scooter: Pay £100.", action: "pay", amount: 100 },
     { text: "Sneaky slumlord: Take a Steal card.", action: "gainStealCard" },
    { text: "Drunk, found cash in a bar stool: Collect £145.", action: "collect", amount: 145 },
    { text: "Drunkenly bribed a cop to avoid arrest: Get out of Detention Center free.", action: "getOutOfDetentionFree" },
    { text: "Drunk, lost wallet in bar: Pay £50.", action: "pay", amount: 50 },
     { text: "Sneaky slumlord: Take a Steal card.", action: "gainStealCard" },
    { text: "Drunkenly pawned your coat for drinks: Pay £70.", action: "pay", amount: 70 },
    { text: "Drunkenly found cash under a bar stool: Collect £145.", action: "collect", amount: 145 },
    { text: "Drunk, caused a bar fire: Move to nearest Payout Space.", action: "moveToNearestPayout" },
    { text: "Drunkenly won a bar raffle: Collect £280.", action: "collect", amount: 140 },
     { text: "Sneaky slumlord: Take a Steal card.", action: "gainStealCard" },
    { text: "Drunkenly sold diarrhea-stained socks as 'art': Collect £275.", action: "collect", amount: 145 },
    { text: "Drunk, destroyed a tenement wall: Pay £40.", action: "pay", amount: 40 },
    { text: "Drunk, found cash in a bar toilet: Collect £115.", action: "collect", amount: 115 },
    { text: "Drunkenly caused a bar riot: Move to nearest Payout Space.", action: "moveToNearestPayout" },
     { text: "Sneaky slumlord: Take a Steal card.", action: "gainStealCard" },
    { text: "Drunkenly won a bar dart tournament: Collect £135.", action: "collect", amount: 135 }
];

const opportunityCards = [
    { text: "Fecal prank racket: Collect £260 from each player.", action: "collectFromPlayers", amount: 160 },
    { text: "Sold diarrhea as 'gourmet sauce': Collect £290.", action: "collect", amount: 190 },
    { text: "Found cash in fecal mess: Collect £255.", action: "collect", amount: 55 },
     { text: "Sneaky slumlord: Take a Steal card.", action: "gainStealCard" },
     { text: "Sneaky slumlord: Take a Steal card.", action: "gainStealCard" },
    { text: "Faked fecal plague for payout: Collect £440.", action: "collect", amount: 140 },
    { text: "Busted for fecal smuggling: Go to Detention Center. Do not pass Dole. Do not collect £300.", action: "goToDetentionDirect" },
    { text: "Bribed guard with fecal pill: Get out of Detention Center free.", action: "getOutOfDetentionFree" },
    { text: "Sold diarrhea as 'detox paste': Collect £160.", action: "collect", amount: 160 },
    { text: "Fecal shack voucher: Next estate purchase is 45% off.", action: "housingVoucher" },
    { text: "Brewed fecal sludge as 'serum': Gain a health service (worth £100).", action: "gainHealthService" },
    { text: "Shat in bank safe: Pay £90.", action: "pay", amount: 90 },
     { text: "Sneaky slumlord: Take a Steal card.", action: "gainStealCard" },
    { text: "Fecal scam racket: Collect £470 from each player.", action: "collectFromPlayers", amount: 170 },
];






const playerEmojis = ['🐕‍🦺', '🚜', '🧸', '🦁', '🖥️', '🦊'];
const playerColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c'];
const playerColorNames = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Teal']; // Added color names
const stealCardEmoji = '🃏';

// --- Token sound mapping ---
const tokenSoundMap = {
    '🐕‍🦺': new Audio('sounds/dog.mp3'),
    '🐱': new Audio('sounds/cat.mp3'),
    '🚜': new Audio('sounds/car.mp3'),
    '🦁': new Audio('sounds/bear.mp3'),
    '🐘': new Audio('sounds/elephant.mp3'),
    '🚀': new Audio('sounds/rocket.mp3')
};
const detentionSound = new Audio('sounds/detention.mp3');
const ohDearSound = new Audio('sounds/ohdear.mp3');
const hotelSound = new Audio('sounds/hotel.mp3');

function playTokenSoundForPlayer(player) {
    try {
        if (!audioContextStarted || !player || typeof player.order !== 'number') return;
        const token = playerEmojis[player.order % playerEmojis.length];
        const audio = tokenSoundMap[token];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    } catch (e) {
        console.error('Error playing token sound:', e);
    }
}

const propertyColorMap = {
    brown: '#8B4513',
    lightblue: '#0066CC',
    pink: '#FF1493',
    orange: '#FFA500',
    red: '#FF0000',
    green: '#008000',
    darkgrey: '#000000'
};

let toneSynth;
let audioContextStarted = false;
let autoRollDiceTimeout = null; // For auto-rolling dice
const AUTO_ROLL_DELAY_MS = 2000; // Delay before auto rolling dice for humans
let constructionSoundboat = null; // For construction sound

// Client-side set to track processed roll IDs for animation
if (!window._processedAnimationRollIds) {
    window._processedAnimationRollIds = new Set();
}



// --- Global state for property swap ---
if (!window._propertySwapState) {
    window._propertySwapState = {
        cardA: null,                 // { playerId, propId } - Initiator's card
        cardB: null,                 // { playerId, propId } - Target's card
        swapInitiatorPlayerId: null, // UID of the player who started the swap
        swapActive: false,           // True when a proposal is made (cardA and cardB selected)
        swapTimeout: null            // Stores setTimeout ID for timeouts
    };
}
// Add a global lock for player move animations
if (!window._playerMoveAnimationLocks) {
    window._playerMoveAnimationLocks = {};
}

// --- Global state for AI Turn processing
if (typeof window._aiTurnInProgress === 'undefined') {
    window._aiTurnInProgress = false;
}

// --- Utility Functions ---
function logEvent(message, data = null) {
    if (data) {
        console.log(`[Game Log] ${new Date().toLocaleTimeString()}: ${message}`, data);
    } else {
        console.log(`[Game Log] ${new Date().toLocaleTimeString()}: ${message}`);
    }
}

function showMessageModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    messageModal.style.display = 'flex';
    
    // Auto-close after 1 second for specific messages
    if (title === "Not your turn" || 
        message === "It's not your turn to roll the dice." ||
        message === "It's not your turn to end, or invalid action.") {
        setTimeout(() => {
            messageModal.style.display = 'none';
        }, 1000);
    }
}
modalOkButton.onclick = () => {
    messageModal.style.display = 'none';
};

function generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function reformatBoardLayout() {
    const newBoardLocations = [ // These are the 'set_property' types from previous change
        { name: "Boat Sank After Renting", type: "set_property", price: 150, rent_base: 200, groupId: "special_set" },
        { name: "People Trafficking", type: "set_property", price: 150, rent_base: 200, groupId: "special_set" },
        { name: "More than 15 children", type: "set_property", price: 150, rent_base: 200, groupId: "special_set" },
        { name: "Crypto Scam from Iqbhal", type: "set_property", price: 150, rent_base: 200, groupId: "special_set" }
    ];

    const crackHouseRents = [185, 250, 300, 350, 400, 450];
    const crackHouseCost = 50;
    const crackHouseColorGroup = "darkgrey";

    const crackHouse1 = { name: "Crack House", type: "property", price: 50, rent: crackHouseRents, color: crackHouseColorGroup, groupId: crackHouseColorGroup, houseCost: crackHouseCost };
    const crackHouse2 = { name: "Crack House", type: "property", price: 70, rent: crackHouseRents, color: crackHouseColorGroup, groupId: crackHouseColorGroup, houseCost: crackHouseCost };
    const crackHouse3 = { name: "Crack House", type: "property", price: 90, rent: crackHouseRents, color: crackHouseColorGroup, groupId: crackHouseColorGroup, houseCost: crackHouseCost };
    const crackHouse4 = { name: "Crack House", type: "property", price: 30, rent: crackHouseRents, color: crackHouseColorGroup, groupId: crackHouseColorGroup, houseCost: crackHouseCost };

    let tempBoard = [];

    // Corner 0: GO
    tempBoard.push(initialBoardLayout.find(s => s.id === 0)); // GO

    // Side 1 (9 spaces: 1-9)
    tempBoard.push(initialBoardLayout.find(s => s.id === 1));       // Original Prop
    tempBoard.push(crackHouse1);                                    // New Crack House
    tempBoard.push(newBoardLocations[0]);                           // Boat Sank (set_property)
    tempBoard.push(initialBoardLayout.find(s => s.id === 3));       // Original Prop
    tempBoard.push(initialBoardLayout.find(s => s.id === 4));       // Original set_property (Black Market)
    tempBoard.push(initialBoardLayout.find(s => s.id === 2));       // Welfare Card (original position was id 2)
    tempBoard.push(initialBoardLayout.find(s => s.id === 5));       // Tax (Fake PIP)
    tempBoard.push(initialBoardLayout.find(s => s.id === 6));       // Original Prop
    tempBoard.push(initialBoardLayout.find(s => s.id === 7));       // Original Prop

    // Corner 1: Detention Center (Visiting) - Will be index 10
    tempBoard.push(initialBoardLayout.find(s => s.id === 8)); 

    // Side 2 (9 spaces: 11-19)
    tempBoard.push(newBoardLocations[1]);                           // People Trafficking (set_property)
    tempBoard.push(crackHouse2);                                    // New Crack House
    tempBoard.push(initialBoardLayout.find(s => s.id === 10));      // Original Prop
    tempBoard.push(initialBoardLayout.find(s => s.id === 11));      // Original Prop
    tempBoard.push(initialBoardLayout.find(s => s.id === 12));      // Original set_property (Forced Marriage)
    tempBoard.push(initialBoardLayout.find(s => s.id === 9));       // Payout: Job Seeker's (original position was id 9)
    tempBoard.push(initialBoardLayout.find(s => s.id === 13));      // Welfare Card (original position was id 13)
    tempBoard.push(initialBoardLayout.find(s => s.id === 14));      // Original Prop
    tempBoard.push(initialBoardLayout.find(s => s.id === 15));      // Original Prop

    // Corner 2: Crime Spree / Free Parking - Will be index 20
    tempBoard.push(initialBoardLayout.find(s => s.id === 16)); 

    // Side 3 (9 spaces: 21-29)
    tempBoard.push(initialBoardLayout.find(s => s.id === 17));      // Original Prop
    tempBoard.push(crackHouse3);                                    // New Crack House
    tempBoard.push(newBoardLocations[2]);                           // More than 15 Children (set_property)
    tempBoard.push(initialBoardLayout.find(s => s.id === 19));      // Original Prop
    tempBoard.push(initialBoardLayout.find(s => s.id === 20));      // Original set_property (Child Wives)
    tempBoard.push(initialBoardLayout.find(s => s.id === 18));      // Opportunity Card (original position was id 18)
    tempBoard.push(initialBoardLayout.find(s => s.id === 21));      // Tax (Fake ID)
    tempBoard.push(initialBoardLayout.find(s => s.id === 22));      // Original Prop
    tempBoard.push(initialBoardLayout.find(s => s.id === 23));      // Original Prop

    // Corner 3: Go To Detention Center - Will be index 30
    tempBoard.push(initialBoardLayout.find(s => s.id === 24)); 

    // Side 4 (9 spaces: 31-39)
    tempBoard.push(initialBoardLayout.find(s => s.id === 25));      // Welfare Card (original position was id 25)
    tempBoard.push(crackHouse4);                                    // New Crack House
    tempBoard.push(initialBoardLayout.find(s => s.id === 26));      // Original Prop
    tempBoard.push(initialBoardLayout.find(s => s.id === 27));      // Original Prop
    tempBoard.push(initialBoardLayout.find(s => s.id === 28));      // Original set_property (I Don't Speak English)
    tempBoard.push(initialBoardLayout.find(s => s.id === 30));      // Opportunity Card (original position was id 30)
    tempBoard.push(initialBoardLayout.find(s => s.id === 29));      // Original Prop
    tempBoard.push(newBoardLocations[3]);                           // Crypto Scam (set_property)
    tempBoard.push(initialBoardLayout.find(s => s.id === 31));      // Original Prop

    boardLayout = tempBoard.map((space, index) => ({ ...space, id: index }));

    const dcSpace = boardLayout.find(s => s.name === "Detention Center");
    detentionCenterSpaceId = dcSpace ? dcSpace.id : 10; // Detention Center is now at index 10
}

function playDetentionSound() {
    if (!audioContextStarted) {
        logEvent("Detention sound skipped: audio context not started.");
        return;
    }
    detentionSound.currentTime = 0;
    detentionSound.play().catch(() => {});
}

function playOhDearSound() {
    if (!audioContextStarted) return;
    ohDearSound.currentTime = 0;
    ohDearSound.play().catch(() => {});
}

function playHotelSound() {
    if (!audioContextStarted) return;
    hotelSound.currentTime = 0;
    hotelSound.play().catch(() => {});
}

async function loadConstructionSound() {
    // No need to preload anything for the synthesized sound
    logEvent("Construction sound synthesizer ready.");
}

function playConstructionSound() {
    if (!audioContextStarted || !Tone) {
        logEvent("Audio context not started or Tone.js not loaded.");
        return;
    }

    try {
        // Create a metallic hit sound using a short envelope and noise + oscillator
        const noise = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: {
                attack: 0.001,
                decay: 0.1,
                sustain: 0,
                release: 0.1
            }
        }).toDestination();

        const synth = new Tone.MetalSynth({
            frequency: 200,
            envelope: {
                attack: 0.001,
                decay: 0.1,
                sustain: 0
            },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5
        }).toDestination();

        // Play both sounds with slight delay to create a "hammer hit" effect
        noise.volume.value = -20;
        synth.volume.value = -15;
        
        noise.triggerAttackRelease("16n");
        setTimeout(() => {
            synth.triggerAttackRelease("16n");
            // Clean up
            setTimeout(() => {
                noise.dispose();
                synth.dispose();
            }, 1000);
        }, 30);

        logEvent("Playing construction hammer sound.");
    } catch (error) {
        console.error("Error playing construction sound:", error);
    }
}

// --- Firebase Setup ---
async function initializeFirebase() {
    if (!firebaseConfigToUse || !firebaseConfigToUse.apiKey || firebaseConfigToUse.apiKey === "YOUR_API_KEY" || !firebaseConfigToUse.projectId) {
        onlineSetupMessage.textContent = "Firebase configuration is missing or incomplete. Online features disabled.";
        console.error("Firebase config is not available or incomplete. Please update it in the script with your actual Firebase project details.");
        createGameButton.disabled = true;
        joinGameButton.disabled = true;
        showMessageModal("Setup Error", "Firebase is not configured. Please check the console for details. Online play is unavailable.");
        return;
    }
    try {
        const app = initializeApp(firebaseConfigToUse);
        db = getFirestore(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                localUserIdSpan.textContent = currentUserId;
                logEvent(`Authenticated as: ${currentUserId}`);
                onlineSetupMessage.textContent = "Connected. Ready to create or join a game.";
                createGameButton.disabled = false;
                joinGameButton.disabled = false;

                presenceDocRef = doc(db, 'online-users', currentUserId);
                try {
                    await setDoc(presenceDocRef, { timestamp: serverTimestamp() }, { merge: true });
                } catch (e) { console.error('Presence set error', e); }

                if (onlineUsersUnsub) onlineUsersUnsub();
                onlineUsersUnsub = onSnapshot(collection(db, 'online-users'), (snap) => {
                    const ids = [];
                    snap.forEach(d => { if (d.id !== currentUserId) ids.push(d.id); });
                    if (onlineUsersListSpan) onlineUsersListSpan.textContent = ids.length ? ids.join(', ') : 'None';
                });

                window.addEventListener('beforeunload', () => {
                    if (presenceDocRef) deleteDoc(presenceDocRef);
                });
            } else {
                currentUserId = null;
                localUserIdSpan.textContent = "Not Signed In";
                if (onlineUsersListSpan) onlineUsersListSpan.textContent = '';
                if (onlineUsersUnsub) { onlineUsersUnsub(); onlineUsersUnsub = null; }
                if (presenceDocRef) { try { await deleteDoc(presenceDocRef); } catch (e) {} presenceDocRef = null; }
                logEvent("User is signed out or initial authentication pending.");

                if (initialAuthToken) {
                    try {
                        await signInWithCustomToken(auth, initialAuthToken);
                        logEvent("Signed in with custom token.");
                    } catch (error) {
                        console.error("Custom token sign-in error:", error);
                        logEvent("Custom token sign-in failed, trying anonymous.");
                        await signInAnonymously(auth);
                    }
                } else {
                    logEvent("No custom token, trying anonymous sign-in.");
                    await signInAnonymously(auth);
                }
            }
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
        onlineSetupMessage.textContent = "Error connecting to Firebase: " + error.message;
        showMessageModal("Firebase Error", "Could not initialize Firebase: " + error.message);
        createGameButton.disabled = true;
        joinGameButton.disabled = true;
    }
}

// --- Game Management Functions (Create, Join, Sync) ---
// Helper function to clear chat messages from Firebase
async function clearFirebaseChat(gameId) {
    if (!gameId || !db) return;
    try {
        const chatRef = collection(db, `games/${gameId}/chat`);
        const chatSnapshot = await getDocs(chatRef);
        const batch = writeBatch(db);
        chatSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        logEvent(`Cleared chat messages for game ${gameId} from Firebase`);
    } catch (error) {
        console.error("Error clearing Firebase chat:", error);
    }
}

async function handleCreateGame() {
    // Password requirement removed - always allow game creation
    if (!currentUserId) {
        showMessageModal("Error", "You are not authenticated. Please wait or refresh.");
        return;
    }
    
    // Clear chat messages from UI
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.innerHTML = '';
    
    localPlayerName = playerNameInput.value.trim() || `Player ${currentUserId.substring(0,4)}`;
    if (!localPlayerName) {
        showMessageModal("Input Needed", "Please enter your player name.");
        return;
    }

    const newGameId = generateGameId();
    currentGameId = newGameId;
    const numHumanPlayers = parseInt(numHumanPlayersSelect.value);
    const numAIPlayers = parseInt(numAIPlayersSelect.value);
    const doublesMode = doublesModeCheckbox && doublesModeCheckbox.checked;
    difficultyLevel = parseInt(difficultySelect.value) || 1;
    deductionMultiplier = difficultyLevel === 3 ? 1.25 : (difficultyLevel === 5 ? 2 : 1);
    const totalPlayers = numHumanPlayers + numAIPlayers;

    if (doublesMode && totalPlayers > 4) {
        showMessageModal("Game Size Error", "Doubles mode supports up to 4 players.");
        return;
    }

    if (totalPlayers < 2 || totalPlayers > 6) {
        showMessageModal("Game Size Error", "Total players (Humans + AI) must be between 2 and 6.");
        return;
    }


    const gameDocRef = doc(db, "games", newGameId);

    reformatBoardLayout();

    const initialPropertyDataForFirestore = boardLayout
        .filter(s => s.type === 'property' || s.type === 'set_property')
        .map(p => ({
            id: p.id,
            name: p.name,
            owner: null,
            tenancies: 0,
            permanentResidence: false,
        }));


    const initialPlayerData = {
        id: currentUserId,
        name: localPlayerName,
        money: 7000,
        position: 0,
        propertiesOwned: [],
        healthServices: 0,
        getOutOfDetentionCards: 0,
        inDetention: false,
        missedTurnsInDetention: 0,
        hasHousingVoucher: false,
        stealCards: 0,
        isBankrupt: false,
        playerActionTakenThisTurn: false,
        doublesRolledInTurn: 0,
        order: 0,
        govReceived: 0,
        isAI: false,
        teamId: doublesMode ? 0 : null
    };

    const initialGameState = {
        gameId: newGameId,
        status: "waiting",
        hostId: currentUserId,
        maxPlayers: doublesMode ? Math.min(4, totalPlayers) : totalPlayers,
        numHumanPlayers: numHumanPlayers, // Store how many human slots are expected
        doublesMode: doublesMode,
        players: numHumanPlayers > 0 ? { [currentUserId]: initialPlayerData } : {},
        playerOrder: numHumanPlayers > 0 ? [currentUserId] : [],
        currentPlayerIndex: 0,
        boardLayout: boardLayout,
        propertyData: initialPropertyDataForFirestore,
        bankMoney: 15000,
        ukGovMoney: 20000,
        shuffledWelfareCards: shuffleDeck([...welfareCards]),
        shuffledOpportunityCards: shuffleDeck([...opportunityCards]),
        welfareCardIndex: 0,
        opportunityCardIndex: 0,
        lastDiceRoll: null,
        lastActionMessage: `${localPlayerName} created the game. Waiting for players...`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        preGameRolls: {},
        preGamePlayersRolled: [],
        preGamePhase: true,
        difficultyLevel: difficultyLevel,
        deductionMultiplier: deductionMultiplier,
        gamePhase: "setup",
        currentCardDraw: null,
        lastRentEvent: null,
        flashingProperties: [], // ENSURE THIS IS INITIALIZED
    };

    // Add AI players immediately
    let currentOrderIndex = numHumanPlayers > 0 ? 1 : 0; // Host is order 0 when participating
    for (let i = 0; i < numAIPlayers; i++) {
        const aiPlayerId = `AI-${crypto.randomUUID().substring(0, 8)}`;
        const aiPlayerName = `AI Bot ${i + 1}`;
        const aiPlayerData = {
            id: aiPlayerId, name: aiPlayerName, money: 7000, position: 0, propertiesOwned: [],
            healthServices: 0, getOutOfDetentionCards: 0, inDetention: false, missedTurnsInDetention: 0,
            hasHousingVoucher: false, stealCards: 0, isBankrupt: false, playerActionTakenThisTurn: false,
            doublesRolledInTurn: 0, order: currentOrderIndex, govReceived: 0, isAI: true,
            teamId: doublesMode ? (currentOrderIndex % 2) : null
        };
        initialGameState.players[aiPlayerId] = aiPlayerData;
        initialGameState.playerOrder.push(aiPlayerId);
        currentOrderIndex++;
    }

    const humanPlayersAddedCount = Object.values(initialGameState.players).filter(p => !p.isAI).length;

    if (humanPlayersAddedCount >= numHumanPlayers) {
        initialGameState.status = "active";
        initialGameState.preGamePhase = true;
        if (numHumanPlayers === 0) {
            initialGameState.lastActionMessage = `${localPlayerName} created an AI-only game with ${numAIPlayers} AI(s). Starting pre-game rolls.`;
        } else {
            initialGameState.lastActionMessage = `${localPlayerName} created the game with ${numAIPlayers} AI(s). Starting pre-game rolls.`;
        }
    } else {
        initialGameState.lastActionMessage = `${localPlayerName} created the game. Waiting for ${numHumanPlayers - humanPlayersAddedCount} more human player(s)...`;
    }


    try {
        await setDoc(gameDocRef, initialGameState);
        logEvent(`Game ${newGameId} created by ${localPlayerName}. Humans: ${numHumanPlayers}, AI: ${numAIPlayers}`);
        onlineSetupMessage.textContent = `Game created! ID: ${newGameId}. ${initialGameState.lastActionMessage}`;
        generatedGameIdSpan.textContent = newGameId;
        gameIdDisplayDiv.style.display = 'block';
        subscribeToGameState(newGameId);
    } catch (error) {
        console.error("Error creating game:", error);
        showMessageModal("Error", "Could not create game: " + error.message);
        onlineSetupMessage.textContent = "Failed to create game. " + error.message;
    }
}

async function handleJoinGame() {
    // Password requirement removed - always allow game joining
    if (!currentUserId) {
        showMessageModal("Error", "You are not authenticated. Please wait or refresh.");
        return;
    }
    
    // Clear chat messages from UI
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.innerHTML = '';
    
    localPlayerName = playerNameInput.value.trim() || `Player ${currentUserId.substring(0,4)}`;
    if (!localPlayerName) {
        showMessageModal("Input Needed", "Please enter your player name.");
        return;
    }

    const gameIdToJoin = gameIdInput.value.trim().toUpperCase();
    if (!gameIdToJoin) {
        showMessageModal("Input Needed", "Please enter a Game ID to join.");
        return;
    }

    const gameDocRef = doc(db, "games", gameIdToJoin);

    try {
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);
            if (!gameDoc.exists()) {
                throw new Error("Game not found.");
            }

            const gameData = gameDoc.data();
            if (gameData.doublesMode && Object.keys(gameData.players || {}).length >= 4 && !gameData.players[currentUserId]) {
                throw new Error("Game full for doubles mode.");
            }
            difficultyLevel = gameData.difficultyLevel || 1;
            deductionMultiplier = difficultyLevel === 3 ? 1.25 : (difficultyLevel === 5 ? 2 : 1);
            if (gameData.boardLayout && gameData.boardLayout.length > 0) {
                boardLayout = gameData.boardLayout;
                const dcSpace = boardLayout.find(s => s.name === "Detention Center");
                detentionCenterSpaceId = dcSpace ? dcSpace.id : (boardLayout.find(s => s.type === "detention_visiting")?.id || 10);
            } else {
                reformatBoardLayout(); // This will use the new 40-space layout
                logEvent("Warning: Joined game was missing boardLayout, reformatted locally.");
            }

            const numHumanPlayersInGame = Object.values(gameData.players).filter(p => !p.isAI).length;

            if (numHumanPlayersInGame >= gameData.numHumanPlayers) {
                if (!gameData.players[currentUserId]) {
                    throw new Error("Game is full for human players.");
                } else {
                    logEvent("Already part of this game as a human player. Rejoining/Resubscribing...");
                }
            }

            if (!gameData.players[currentUserId]) {
                const newPlayerOrderIndex = gameData.playerOrder.length;

                const newPlayerData = {
                    id: currentUserId, name: localPlayerName, money: 7000, position: 0, propertiesOwned: [],
                    healthServices: 0, getOutOfDetentionCards: 0, inDetention: false, missedTurnsInDetention: 0,
                    hasHousingVoucher: false, stealCards: 0, isBankrupt: false, playerActionTakenThisTurn: false,
                    doublesRolledInTurn: 0, order: newPlayerOrderIndex, govReceived: 0, isAI: false,
                    teamId: gameData.doublesMode ? (newPlayerOrderIndex % 2) : null
                };

                const updates = {};
                updates[`players.${currentUserId}`] = newPlayerData;
                updates.playerOrder = arrayUnion(currentUserId);
                updates.updatedAt = serverTimestamp();

                const newTotalHumanCount = numHumanPlayersInGame + 1;

                if (newTotalHumanCount === gameData.numHumanPlayers) {
                    updates.preGamePhase = true;
                    updates.status = "active";
                    updates.lastActionMessage = `${localPlayerName} joined. All human players present! Starting pre-game rolls.`;
                } else {
                    updates.lastActionMessage = `${localPlayerName} joined the game. Waiting for ${gameData.numHumanPlayers - newTotalHumanCount} more human player(s).`;
                }
                transaction.update(gameDocRef, updates);
                logEvent(`${localPlayerName} joining game ${gameIdToJoin}. Player order index: ${newPlayerOrderIndex}`);
            }
        });

        currentGameId = gameIdToJoin;
        onlineSetupMessage.textContent = `Joined game ${gameIdToJoin}! Waiting for game to start...`;
        subscribeToGameState(gameIdToJoin);

    } catch (error) {
        console.error("Error joining game:", error);
        showMessageModal("Error", "Could not join game: " + error.message);
        onlineSetupMessage.textContent = "Failed to join game. " + error.message;
    }
}
// --- Firestore-driven Property Swap State ---
// Helper to clear swap proposal in Firestore
globalThis.clearSwapProposalInFirestore = async function(gameDocRef) {
    await updateDoc(gameDocRef, {
        currentSwapProposal: null,
        flashingProperties: [],
        updatedAt: serverTimestamp(),
    });
};

// --- Patch subscribeToGameState to sync swap state ---
function subscribeToGameState(gameId) {
    if (unsubscribeGameState) {
        unsubscribeGameState();
    }
    
    // Clear chat messages when subscribing to a new game
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) chatMessages.innerHTML = '';
    clearFirebaseChat(gameId); // Clear Firebase chat for the new game
    
    const gameDocRef = doc(db, "games", gameId);
    unsubscribeGameState = onSnapshot(gameDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            const gameData = docSnap.data();
            
            // Clear chat when game transitions to active state
            if (gameData.status === "active" && (!localGameData.status || localGameData.status !== "active")) {
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages) chatMessages.innerHTML = '';
                await clearFirebaseChat(gameId);
            }

            if (localGameData.players && gameData.players && currentUserId &&
                localGameData.players[currentUserId] && gameData.players[currentUserId]) {

                const oldMoney = localGameData.players[currentUserId].money;
                const newMoney = gameData.players[currentUserId].money;

                if (typeof oldMoney !== 'undefined' && newMoney < oldMoney) {
                    const amountLost = oldMoney - newMoney;
                    if (amountLost > 0) {
                        showMoneyChangeEffect(amountLost, 'loss');
                    }
                } else if (typeof oldMoney !== 'undefined' && newMoney > oldMoney) {
                    const amountGained = newMoney - oldMoney;
                    if (amountGained > 0) {
                        showMoneyChangeEffect(amountGained, 'gain');
                    }
                }
            }

            const previousLocalGameDataForComparison = { ...localGameData }; // Store previous before overwriting
            localGameData = gameData;
            difficultyLevel = gameData.difficultyLevel || 1;
            deductionMultiplier = gameData.deductionMultiplier || (difficultyLevel === 3 ? 1.25 : (difficultyLevel === 5 ? 2 : 1));
            logEvent("Game state updated from Firestore:", gameData.lastActionMessage || "No message", gameData.status);

            // Animate opponent moves
            if (gameData.lastDiceRoll && gameData.players && previousLocalGameDataForComparison.players) { // Check previous state
                Object.values(gameData.players).forEach(player => {
                    if (player.id !== currentUserId && previousLocalGameDataForComparison.players[player.id]) {
                        const oldPlayerState = previousLocalGameDataForComparison.players[player.id];
                        if (oldPlayerState.position !== player.position &&
                            player.id === gameData.playerOrder[gameData.currentPlayerIndex] &&
                            !player.inDetention && !oldPlayerState.inDetention ) {

                            const playerMakingTurnId = gameData.playerOrder[gameData.currentPlayerIndex]; // This is the player whose turn it was
                            // Ensure the lastDiceRoll corresponds to the player who just moved and hasn't been animated yet
                            if (gameData.lastDiceRoll && gameData.lastDiceRoll.playerId === player.id && gameData.lastDiceRoll.rollId) {
                                if (!window._processedAnimationRollIds.has(gameData.lastDiceRoll.rollId)) {
                                    logEvent(`Animating move for opponent ${player.name} from ${oldPlayerState.position} to ${player.position} for rollId ${gameData.lastDiceRoll.rollId}`);
                                    animatePlayerMove(player.id, oldPlayerState.position, gameData.lastDiceRoll.total, gameData.boardLayout);
                                    window._processedAnimationRollIds.add(gameData.lastDiceRoll.rollId);

                                    // Basic cleanup for the set to prevent unbounded growth
                                    if (window._processedAnimationRollIds.size > Object.keys(gameData.players).length * 5) {
                                        const oldestRolls = Array.from(window._processedAnimationRollIds).slice(0, window._processedAnimationRollIds.size - Object.keys(gameData.players).length * 3);
                                        oldestRolls.forEach(id => window._processedAnimationRollIds.delete(id));
                                        logEvent(`Cleaned up ${oldestRolls.length} old rollIDs from animation tracking set.`);
                                    }
                            } else {
                                    logEvent(`Skipping animation for opponent ${player.name}, rollId ${gameData.lastDiceRoll.rollId} already processed.`);
                                }
                            }
                        }
                    }
                    // Check for newly detained players to play detention sound
                    const oldPlayerStateForSiren = previousLocalGameDataForComparison.players[player.id];
                    if (oldPlayerStateForSiren && player.inDetention && !oldPlayerStateForSiren.inDetention) {
                        logEvent(`Player ${player.name} (ID: ${player.id}) was just sent to detention. Playing sound.`);
                        playDetentionSound();
                    }

                    // Play sounds based on property development when landing
                    if (oldPlayerStateForSiren && oldPlayerStateForSiren.position !== player.position) {
                        const landedSpace = gameData.boardLayout[player.position];
                        if (landedSpace && (landedSpace.type === 'property' || landedSpace.type === 'set_property')) {
                            const propData = gameData.propertyData.find(p => p.id === landedSpace.id);
                            if (propData) {
                                if (propData.permanentResidence) {
                                    playHotelSound();
                                } else if (propData.tenancies > 3) {
                                    playOhDearSound();
                                }
                            }
                        }
                    }
                });
            }

            if (gameData.lastRentEvent && (!window._lastRentEventIdShown || window._lastRentEventIdShown !== gameData.lastRentEvent.id)) {
                window._lastRentEventIdShown = gameData.lastRentEvent.id;
                showRentFlashEffect(gameData.lastRentEvent.payerName, gameData.lastRentEvent.recipientName, gameData.lastRentEvent.amount, gameData.lastRentEvent.propertyName, gameData.players[gameData.lastRentEvent.recipientId]?.order);
            }

            if (gameData.boardLayout && JSON.stringify(boardLayout) !== JSON.stringify(gameData.boardLayout)) {
                logEvent("Board layout received from Firestore is different or not set, adopting it.");
                boardLayout = gameData.boardLayout;
                const dcSpace = boardLayout.find(s => s.name === "Detention Center");
                detentionCenterSpaceId = dcSpace ? dcSpace.id : (boardLayout.find(s => s.type === "detention_visiting")?.id || 10);
                if (boardContainer.innerHTML.trim() !== '') {
                    logEvent("Board was already drawn, re-setting up from new Firestore layout.");
                    setupBoardFromFirestore(gameData);
                }
            }

            if (gameData.currentCardDraw && (!window._lastCardDrawIdShown || window._lastCardDrawIdShown !== gameData.currentCardDraw.id)) {
                window._lastCardDrawIdShown = gameData.currentCardDraw.id;
                logEvent("New card draw detected in onSnapshot:", gameData.currentCardDraw);
                showCardModal(gameData.currentCardDraw, gameData.currentCardDraw.type, async () => {
                    if (gameData.currentCardDraw.playerId === currentUserId || (localGameData.players[gameData.currentCardDraw.playerId]?.isAI && currentUserId === localGameData.hostId) ) {
                        await applyCardAction(gameData.currentCardDraw, gameData.currentCardDraw.playerId, gameData.currentCardDraw.type.toLowerCase());
                    }
                });
            } else if (!gameData.currentCardDraw) {
                window._lastCardDrawIdShown = null;
                if (onBoardCardDisplayDiv && onBoardCardDisplayDiv.style.display === 'flex') {
                    onBoardCardDisplayDiv.style.display = 'none';
                }
            }

            updateLocalUIFromFirestore(gameData);

            if (currentGameId && onlineSetupScreen.style.display !== 'none' && (gameData.status === "active" || gameData.status === "finished")) {
                onlineSetupScreen.style.display = 'none';
                gameContainer.style.display = 'flex';
                logEvent("Switched to game container as game status is active/finished and setup screen was visible.");
            }
            // AI Turn Logic Trigger
            if (
                gameData.status === "active" &&
                !gameData.preGamePhase &&
                gameData.playerOrder &&
                gameData.players &&
                gameData.hostId === currentUserId // Only host processes AI turns
            ) {
                const currentPlayerId = gameData.playerOrder[gameData.currentPlayerIndex];
                const currentPlayer = gameData.players[currentPlayerId];

                if (currentPlayer && currentPlayer.isAI && !currentPlayer.isBankrupt) {
                    if (!window._aiTurnInProgress) { // Check lock
                        window._aiTurnInProgress = true; // Acquire lock
                        logEvent(`Host (${currentUserId}) is setting AI lock and about to trigger AI turn for ${currentPlayerId}.`);
                        
                        // Add a small delay to ensure all previous turn actions are complete
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Verify it's still this AI's turn before proceeding
                        const verifySnapshot = await getDoc(gameDocRef);
                        if (verifySnapshot.exists()) {
                            const verifyData = verifySnapshot.data();
                            const stillAIsTurn = verifyData.playerOrder[verifyData.currentPlayerIndex] === currentPlayerId;
                            const stillAIPlayer = verifyData.players[currentPlayerId]?.isAI;
                            const stillNotBankrupt = !verifyData.players[currentPlayerId]?.isBankrupt;
                            const stillHost = currentUserId === verifyData.hostId;
                            const stillActiveNoPreGame = verifyData.status === "active" && !verifyData.preGamePhase;

                            if (stillAIsTurn && stillAIPlayer && stillNotBankrupt && stillHost && stillActiveNoPreGame) {
                                logEvent(`AI ${currentPlayerId} turn conditions still valid. Processing turn.`);
                                await handleAITurn(verifyData, currentPlayerId);
                            } else {
                                logEvent(`AI ${currentPlayerId} turn skipped: Conditions no longer valid after verification.`);
                                window._aiTurnInProgress = false;
                            }
                        } else {
                            logEvent(`AI ${currentPlayerId} turn skipped: Game document not found during verification.`);
                            window._aiTurnInProgress = false;
                        }
                    } else {
                        logEvent(`AI ${currentPlayerId} turn skipped: Previous AI turn still in progress (lock held).`);
                    }
                } else if (currentPlayer && !currentPlayer.isAI && window._aiTurnInProgress) {
                    logEvent(`Switched to human player ${currentPlayerId}'s turn, but AI lock was on. Releasing AI lock.`);
                    window._aiTurnInProgress = false;
                }
            }

            // --- Sync property swap state from Firestore ---
            if (gameData.currentSwapProposal) {
                window._propertySwapState = { ...gameData.currentSwapProposal };
                // Timeout: if proposal is older than 10s, clear it
                if (Date.now() - (gameData.currentSwapProposal.swapTimeoutSetAt || 0) > 10000) {
                    await clearSwapProposalInFirestore(gameDocRef);
                    window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
                }
            } else {
                window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
            }

        } else {
            logEvent(`Game ${gameId} no longer exists or access denied.`);
            showMessageModal("Game Ended", "The game session has ended or is no longer available.");
            if (unsubscribeGameState) unsubscribeGameState();
            resetToSetupScreen();
        }
    }, (error) => {
        console.error("Error listening to game state:", error);
        showMessageModal("Connection Error", "Lost connection to the game: " + error.message);
        if (unsubscribeGameState) unsubscribeGameState();
        resetToSetupScreen();
    });
}

function resetToSetupScreen() {
    onlineSetupScreen.style.display = 'flex';
    gameContainer.style.display = 'none';
    currentGameId = null;
    localGameData = {};
    if (unsubscribeGameState) {
        unsubscribeGameState();
        unsubscribeGameState = null;
    }
    onlineSetupMessage.textContent = "Ready to create or join a new game.";
    gameIdDisplayDiv.style.display = 'none';
    generatedGameIdSpan.textContent = '';
    gameIdInput.value = '';
    boardLayout = [];
    if(boardContainer) boardContainer.innerHTML = '';
    if(playerInfoDiv) playerInfoDiv.innerHTML = '';
    if(diceFace1Elem) diceFace1Elem.textContent = '--';
    if(diceFace2Elem) diceFace2Elem.textContent = '--';
    if(diceTotalDisplayText) diceTotalDisplayText.textContent = '';
    if(currentTurnDisplay) currentTurnDisplay.textContent = 'Current Turn: Player 1';
    if(gameStatusMessageP) gameStatusMessageP.textContent = 'Waiting for game to start...';
    // Reset swap state
    window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
}

async function finalizePreGameAsHost() {
    if (!currentGameId || !currentUserId || !db || !localGameData.hostId || localGameData.hostId !== currentUserId) {
        logEvent("finalizePreGameAsHost: Conditions not met.");
        return;
    }
    
    // Check if we're already finalizing to prevent multiple calls
    if (window._finalizingPreGame) {
        logEvent("finalizePreGameAsHost: Already finalizing, skipping.");
        return;
    }
    window._finalizingPreGame = true;
    
    logEvent("Host attempting to finalize pre-game rolls.");

    const gameDocRef = doc(db, "games", currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) {
                throw new Error("Game document not found during host finalization.");
            }
            const freshGameData = freshGameDoc.data();

            if (!freshGameData.preGamePhase) {
                logEvent("Host finalization: Pre-game phase already ended.");
                return;
            }
            if (freshGameData.hostId !== currentUserId) {
                logEvent("Host finalization check: Current user is NOT host in fresh data. Aborting.");
                return;
            }

            const allPlayersInOrder = freshGameData.playerOrder || [];
            const currentPreGameRolls = freshGameData.preGameRolls || {};
            const allHaveRolled = allPlayersInOrder.length > 0 &&
                allPlayersInOrder.length === freshGameData.maxPlayers &&
                allPlayersInOrder.every(pid => currentPreGameRolls[pid] !== undefined);

            if (!allHaveRolled) {
                logEvent("Host finalization: Not all players have rolled or not all joined. Aborting.");
                return;
            }

            logEvent("Host is proceeding with finalization of pre-game rolls.");
            let updates = {};
            const sortedPlayerIds = [...allPlayersInOrder].sort((a, b) => {
                const rollA = currentPreGameRolls[a];
                const rollB = currentPreGameRolls[b];
                if (rollB === rollA) {
                    return (freshGameData.players[a]?.order || 0) - (freshGameData.players[b]?.order || 0);
                }
                return rollB - rollA;
            });

            updates.playerOrder = sortedPlayerIds;
            updates.currentPlayerIndex = 0;
            updates.preGamePhase = false;
            updates.gamePhase = "main";
            updates.status = "active";
            updates.lastActionMessage = `Starting order determined by host. ${freshGameData.players[sortedPlayerIds[0]].name} starts!`;
            updates.updatedAt = serverTimestamp();

            transaction.update(gameDocRef, updates);
            logEvent("Host successfully finalized pre-game starting order.");
        });
    } catch (error) {
        console.error("Error during host finalization of pre-game rolls:", error);
        showMessageModal("Host Finalization Error", "Could not finalize game start: " + error.message);
    } finally {
        window._finalizingPreGame = false;
    }
}

// --- UI HELPER FUNCTION DEFINITIONS ---
function updateDiceUIDisplay(gameData) {
    const diceDisplayContainer = document.getElementById('actual-dice-faces');
    if (!diceFace1Elem || !diceFace2Elem || !diceTotalDisplayText || !diceDisplayContainer) return;

    // Set the current player's color on the dice container
    if (gameData.playerOrder && gameData.players && gameData.currentPlayerIndex >= 0) {
        const currentPlayerId = gameData.playerOrder[gameData.currentPlayerIndex];
        const currentPlayer = gameData.players[currentPlayerId];
        if (currentPlayer && typeof currentPlayer.order !== 'undefined') {
            const playerColor = playerColors[currentPlayer.order % playerColors.length];
            document.documentElement.style.setProperty('--current-player-dice-color', playerColor);
            diceFace1Elem.style.color = playerColor;
            diceFace2Elem.style.color = playerColor;
            diceFace1Elem.style.borderColor = playerColor;
            diceFace2Elem.style.borderColor = playerColor;
        }
    }

    if (gameData.lastDiceRoll && gameData.gamePhase === "main" && !gameData.preGamePhase) {
        diceFace1Elem.textContent = gameData.lastDiceRoll.die1;
        diceFace2Elem.textContent = gameData.lastDiceRoll.die2;
        diceTotalDisplayText.textContent = ` = ${gameData.lastDiceRoll.total}`;

        diceDisplayContainer.classList.remove('dice-animation');
        void diceDisplayContainer.offsetWidth;
        diceDisplayContainer.classList.add('dice-animation');
    } else {
        diceFace1Elem.textContent = '--';
        diceFace2Elem.textContent = '--';
        diceTotalDisplayText.textContent = '';
        diceDisplayContainer.classList.remove('dice-animation');
    }
}

function updatePlayerInfoPanel(gameData) {
    if (!playerInfoDiv) return;
    
    playerInfoDiv.innerHTML = '';
    
    // Add music toggle at the top
    const musicToggleDiv = document.createElement('div');
    musicToggleDiv.style.display = 'flex';
    musicToggleDiv.style.alignItems = 'center';
    musicToggleDiv.style.justifyContent = 'space-between';
    musicToggleDiv.style.marginBottom = '10px';
    musicToggleDiv.style.padding = '5px';
    musicToggleDiv.style.borderBottom = '1px solid #ccc';
    
    const musicLabel = document.createElement('span');
    musicLabel.textContent = 'Music';
    musicLabel.style.fontWeight = 'bold';
    
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'switch';
    toggleSwitch.style.position = 'relative';
    toggleSwitch.style.display = 'inline-block';
    toggleSwitch.style.width = '40px';  // Reduced from 50px
    toggleSwitch.style.height = '20px'; // Reduced from 24px
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isMusicPlaying;
    checkbox.style.opacity = '0';
    checkbox.style.width = '0';
    checkbox.style.height = '0';
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    slider.style.position = 'absolute';
    slider.style.cursor = 'pointer';
    slider.style.top = '0';
    slider.style.left = '0';
    slider.style.right = '0';
    slider.style.bottom = '0';
    slider.style.backgroundColor = isMusicPlaying ? '#2196F3' : '#ccc';
    slider.style.transition = '.4s';
    slider.style.borderRadius = '20px';
    
    const sliderBefore = document.createElement('span');
    sliderBefore.style.position = 'absolute';
    sliderBefore.style.content = '""';
    sliderBefore.style.height = '14px';  // Reduced from 16px
    sliderBefore.style.width = '14px';   // Reduced from 16px
    sliderBefore.style.left = isMusicPlaying ? '22px' : '3px'; // Adjusted for new size
    sliderBefore.style.bottom = '3px';   // Adjusted for new size
    sliderBefore.style.backgroundColor = 'white';
    sliderBefore.style.transition = '.4s';
    sliderBefore.style.borderRadius = '50%';
    
    slider.appendChild(sliderBefore);
    toggleSwitch.appendChild(checkbox);
    toggleSwitch.appendChild(slider);
    
    checkbox.addEventListener('change', () => {
        toggleBackgroundMusic();
        if (checkbox.checked) {
            slider.style.backgroundColor = '#2196F3';
            sliderBefore.style.left = '22px';
        } else {
            slider.style.backgroundColor = '#ccc';
            sliderBefore.style.left = '3px';
        }
    });
    
    musicToggleDiv.appendChild(musicLabel);
    musicToggleDiv.appendChild(toggleSwitch);
    playerInfoDiv.appendChild(musicToggleDiv);
    
    if (!gameData.playerOrder || !gameData.players) {
        logEvent("updatePlayerInfoPanel: Missing playerOrder or players data.");
        return;
    }

    gameData.playerOrder.forEach(playerId => {
        const p = gameData.players[playerId];
        if (!p || typeof p.id === 'undefined' || typeof p.order === 'undefined') {
            logEvent("updatePlayerInfoPanel: Invalid player data encountered for ID:", playerId, p);
            return;
        };

        const playerColor = playerColors[p.order % playerColors.length];
        const playerToken = playerEmojis[p.order % playerEmojis.length];
        const pDiv = document.createElement('div');
        pDiv.style.display = 'flex';
        pDiv.style.alignItems = 'center';
        pDiv.style.justifyContent = 'space-between';
        pDiv.style.gap = '8px';
        pDiv.style.marginBottom = '2px';
        const teamLabel = gameData.doublesMode && typeof p.teamId === 'number' ? ` (Team ${p.teamId + 1})` : '';
        if (p.isBankrupt) {
            pDiv.innerHTML = `<b style="color:${playerColor};">${p.name} ${p.isAI ? "(AI)" : ""}${teamLabel}</b>: <span style='font-weight:bold; text-decoration:line-through; opacity:0.6;'>BANKRUPT</span>`;
        } else {
            pDiv.innerHTML = `<span style='display:flex;align-items:center;gap:4px;'><b style='color:${playerColor};'>${playerToken} ${p.name} ${p.isAI ? "(AI)" : ""}${teamLabel}</b>${p.inDetention ? ` <span style='font-size:0.85em;'>(In Detention - ${p.missedTurnsInDetention} missed)</span>` : ''}</span><span class='cash-total' style='font-weight:bold; min-width:70px; text-align:right; display:inline-block;'>£${p.money}</span>`;
        }
        if (!gameData.preGamePhase && gameData.status === "active" && gameData.playerOrder[gameData.currentPlayerIndex] === p.id && !p.isBankrupt) {
            pDiv.style.border = `2px solid ${playerColor}`;
            pDiv.style.padding = "3px";
            pDiv.style.borderRadius = "4px";
            pDiv.classList.add('player-highlight');
        } else {
            pDiv.classList.remove('player-highlight');
        }
        playerInfoDiv.appendChild(pDiv);
    });
}

function updateGameStatusPanel(gameData) {
    // --- "You Are : [ColorName]" display ---
    let youAreDisplayElement = document.getElementById('you-are-display');
    let stealTokenElement = document.getElementById('steal-token-display');
    const currentTurnDisplayRef = document.getElementById('current-turn-display'); // Ensure we have this reference

    if (!youAreDisplayElement && currentTurnDisplayRef && currentTurnDisplayRef.parentNode) {
        if (document.getElementById('you-are-display') === null) { // Create only if it truly doesn't exist
            youAreDisplayElement = document.createElement('h2');
            youAreDisplayElement.id = 'you-are-display';
            youAreDisplayElement.style.textAlign = 'center';
            youAreDisplayElement.style.fontSize = '1.2em'; // Slightly smaller than current turn display
            youAreDisplayElement.style.marginBottom = '3px'; // Optional spacing
            currentTurnDisplayRef.parentNode.insertBefore(youAreDisplayElement, currentTurnDisplayRef);
        } else {
            youAreDisplayElement = document.getElementById('you-are-display'); // Re-fetch if somehow missed
        }
    }

    if (!stealTokenElement && youAreDisplayElement && youAreDisplayElement.parentNode) {
        stealTokenElement = document.createElement('span');
        stealTokenElement.id = 'steal-token-display';
        stealTokenElement.style.marginRight = '4px';
        stealTokenElement.style.fontSize = '1.2em';
        youAreDisplayElement.parentNode.insertBefore(stealTokenElement, youAreDisplayElement);
    }

    if (youAreDisplayElement) {
        if (currentUserId && gameData.players && gameData.players[currentUserId]) {
            const localPlayer = gameData.players[currentUserId];
            if (localPlayer && typeof localPlayer.order !== 'undefined') {
                const playerHexColor = playerColors[localPlayer.order % playerColors.length];
                const colorName = playerColorNames[localPlayer.order % playerColorNames.length];
                const playerToken = playerEmojis[localPlayer.order % playerEmojis.length];
                // Only show token and color, larger
                youAreDisplayElement.innerHTML = `<span style="color: ${playerHexColor}; font-weight: bold; font-size: 1.6em; vertical-align: middle;">${playerToken} ${colorName}</span>`;
                youAreDisplayElement.style.display = 'block';
                youAreDisplayElement.style.margin = '0 0 2px 0'; // Remove gap above and below

                if (stealTokenElement) {
                    const stealCount = localPlayer.stealCards || 0;
                    if (stealCount > 0) {
                        stealTokenElement.textContent = stealCardEmoji.repeat(stealCount);
                        stealTokenElement.style.display = 'inline';
                    } else {
                        stealTokenElement.textContent = '';
                        stealTokenElement.style.display = 'none';
                    }
                }
            } else {
                 youAreDisplayElement.innerHTML = '';
                 youAreDisplayElement.style.display = 'none';
                 if (stealTokenElement) {
                     stealTokenElement.textContent = '';
                     stealTokenElement.style.display = 'none';
                 }
            }
        } else {
            youAreDisplayElement.innerHTML = '';
            youAreDisplayElement.style.display = 'none';
            if (stealTokenElement) {
                stealTokenElement.textContent = '';
                stealTokenElement.style.display = 'none';
            }
        }
    }
    // --- End of "You Are : [ColorName]" display ---

    if (!gameStatusMessageP || !currentTurnDisplayRef || !gameData.players || !gameData.playerOrder) {
        // Log or handle missing critical elements if necessary, then return
        // console.warn("updateGameStatusPanel: Missing critical DOM elements or game data.");
        return;
    }

    if (gameData.preGamePhase) {
        const joinedHumans = Object.values(gameData.players).filter(p => !p.isAI).length;
        if (joinedHumans < gameData.numHumanPlayers) {
            updateGameStatus(`Waiting for human players... (${joinedHumans}/${gameData.numHumanPlayers} joined)`);
        } else {
            const allPlayersCount = gameData.playerOrder.length;
            const allRolled = allPlayersCount > 0 && gameData.playerOrder.every(pid => gameData.preGameRolls && gameData.preGameRolls[pid] !== undefined);
            if (allRolled) {
                updateGameStatus("All players rolled. Host is determining start order...");
            } else {
                updateGameStatus("Pre-game: All human players joined. Determine starting player by rolling.");
            }
        }
    } else if (gameData.status === "active" && gameData.gamePhase === "main") {
        updateGameStatus(gameData.lastActionMessage || "Game in progress...");
    } else if (gameData.status === "finished") {
        updateGameStatus(gameData.lastActionMessage || "Game Over!");
    } else {
        const joinedHumans = Object.values(gameData.players).filter(p => !p.isAI).length;
        updateGameStatus(`Waiting for players... (${joinedHumans}/${gameData.numHumanPlayers} humans joined)`);
    }

    const currentPlayerIdInOrder = gameData.playerOrder[gameData.currentPlayerIndex];
    const currentPlayerInOrder = gameData.players[currentPlayerIdInOrder];

    if (currentPlayerInOrder && gameData.status === "active") {
        const playerNameForDisplay = `${currentPlayerInOrder.name}${currentPlayerInOrder.isAI ? " (AI)" : ""}`;
        if (gameData.preGamePhase) {
            let nextPlayerToRollForDisplayId = null;
            for(const pid of gameData.playerOrder) {
                if(!gameData.preGameRolls || gameData.preGameRolls[pid] === undefined) {
                    nextPlayerToRollForDisplayId = pid;
                    break;
                }
            }
            const playerToRoll = gameData.players[nextPlayerToRollForDisplayId];
            const playerToRollName = playerToRoll ? `${playerToRoll.name}${playerToRoll.isAI ? " (AI)" : ""}` : null;


            if (playerToRoll && typeof playerToRoll.order !== 'undefined') {
                currentTurnDisplay.textContent = `Pre-Game Roll: ${playerToRollName}`;
                currentTurnDisplay.style.color = playerColors[playerToRoll.order % playerColors.length];
                currentTurnDisplay.classList.remove('pulsing');
            } else if (gameData.playerOrder.length === gameData.maxPlayers && gameData.playerOrder.every(pid => gameData.preGameRolls && gameData.preGameRolls[pid] !== undefined)) {
                currentTurnDisplay.textContent = "Pre-Game Rolls Complete";
                currentTurnDisplay.style.color = '#ecf0f1'; // Default color for this status
                currentTurnDisplay.classList.remove('pulsing');
            } else {
                currentTurnDisplay.textContent = "Waiting for Players...";
                currentTurnDisplay.style.color = '#ecf0f1'; // Default color
                currentTurnDisplay.classList.remove('pulsing');
            }
        } else if (gameData.gamePhase === "main" && !currentPlayerInOrder.isBankrupt) {
            // currentTurnDisplay.textContent = `Current Turn: ${playerNameForDisplay}`;
            // currentTurnDisplay.style.color = playerColors[currentPlayerInOrder.order % playerColors.length];
            const playerColor = playerColors[currentPlayerInOrder.order % playerColors.length];
            currentTurnDisplay.innerHTML = `<span style="color: white;">Current Player: </span><span style="color: ${playerColor};">${playerNameForDisplay}</span>`;
            currentTurnDisplay.classList.add('pulsing');
        } else if (gameData.gamePhase === "main" && currentPlayerInOrder.isBankrupt) {
            currentTurnDisplay.textContent = `Skipping Bankrupt: ${playerNameForDisplay}`;
            currentTurnDisplay.style.color = '#7f8c8d'; // Muted color for skipped bankrupt player
            currentTurnDisplay.classList.remove('pulsing');
        }
    } else if (gameData.status === "finished") {
        currentTurnDisplay.textContent = "Game Over!";
        currentTurnDisplay.style.color = '#e74c3c';
        currentTurnDisplay.classList.remove('pulsing');
    } else {
        currentTurnDisplay.textContent = "Game Not Fully Started";
        currentTurnDisplay.style.color = '#ecf0f1'; // Default color
        currentTurnDisplay.classList.remove('pulsing');
    }
}

function updateControlsBasedOnTurn(gameData) {
    if (!currentUserId || !gameData.players || !gameData.players[currentUserId]) {
        rollDiceButton.style.display = 'none';
        endTurnButton.style.display = 'none';
        buyPropertyButton.style.display = 'none';
        developPropertyButton.style.display = 'none';
        otherActionsContainer.style.display = 'none';
        detentionActionsDiv.innerHTML = '';
        return;
    }
    const amIBankrupt = gameData.players[currentUserId]?.isBankrupt;
    const amIAI = gameData.players[currentUserId]?.isAI;

    // Default to hidden
    rollDiceButton.style.display = 'none';
    endTurnButton.style.display = 'none';
    buyPropertyButton.style.display = 'none';
    developPropertyButton.style.display = 'none';
    otherActionsContainer.style.display = 'none';
    detentionActionsDiv.innerHTML = '';

    if (amIBankrupt || amIAI || gameData.status === "finished" || gameData.preGamePhase) {
        const playerToken = document.getElementById(`player-token-${currentUserId}`);
        if (playerToken) playerToken.classList.remove('token-flash');
        if (autoRollDiceTimeout) {
            clearTimeout(autoRollDiceTimeout);
            autoRollDiceTimeout = null;
        }
        return;
    }

    if (gameData.status !== "active" || gameData.gamePhase !== "main") {
        if (autoRollDiceTimeout) {
            clearTimeout(autoRollDiceTimeout);
            autoRollDiceTimeout = null;
        }
        return;
    }

    const isMyTurn = gameData.playerOrder[gameData.currentPlayerIndex] === currentUserId;
    const myPlayerState = gameData.players[currentUserId];
    const amIInDetention = myPlayerState.inDetention;
    const myPlayerActionTakenThisTurn = myPlayerState.playerActionTakenThisTurn;

    // Close development window if it's no longer the player's turn
    if (!isMyTurn && developPropertyContainer && developPropertyContainer.style.display !== 'none') {
        developPropertyContainer.style.display = 'none';
        logEvent("Turn changed, closing development window.");
    }

    if (autoRollDiceTimeout && !isMyTurn) { // Clear if it's no longer my turn
        clearTimeout(autoRollDiceTimeout);
        autoRollDiceTimeout = null;
        logEvent("Not my turn anymore, cleared auto-roll dice timeout.");
    } else if (isMyTurn && autoRollDiceTimeout && (amIInDetention || cardDisplayContainer.style.display !== 'none' || (onBoardCardDisplayDiv && onBoardCardDisplayDiv.style.display !== 'none'))) {
        // Clear if conditions for auto-roll are clearly no longer met (e.g., in detention, card shown)
        clearTimeout(autoRollDiceTimeout);
        autoRollDiceTimeout = null;
        logEvent("Auto-roll conditions invalidated (detention/card), cleared timeout.");
    }

    const playerToken = document.getElementById(`player-token-${currentUserId}`);
    if (isMyTurn) {
        if (playerToken && cardDisplayContainer.style.display === 'none' && developPropertyContainer.style.display === 'none' && (!onBoardCardDisplayDiv || onBoardCardDisplayDiv.style.display === 'none')) {
            playerToken.classList.add('token-flash');
        } else if (playerToken) {
            playerToken.classList.remove('token-flash');
        }
    } else {
        if (playerToken) playerToken.classList.remove('token-flash');
    }


    if (isMyTurn) {
        if (amIInDetention) {
            setupDetentionActionsUI(myPlayerState, gameData);
            // End turn is available if action for detention turn is taken (e.g., failed roll, paid fine to stay, etc.)
            if (myPlayerActionTakenThisTurn) {
                endTurnButton.style.display = 'block';
                endTurnButton.disabled = false;
                endTurnButton.classList.add('main-action-button');
                detentionActionsDiv.innerHTML = ''; // Clear actions if turn can be ended
            }
        } else { // Not in detention
            const rolledDoubles = gameData.lastDiceRoll?.isDoubles;
            const doublesCount = myPlayerState.doublesRolledInTurn || 0;

            // Roll Dice button is primary if no action taken OR if doubles allow another roll
            if (!myPlayerActionTakenThisTurn || (rolledDoubles && doublesCount > 0 && doublesCount < 3) ) {
                rollDiceButton.style.display = 'block';
                rollDiceButton.disabled = false;
                rollDiceButton.classList.add('main-action-button');
                rollDiceButton.classList.add('pulse');
                // Add pulsing class if it is the primary action
                if (!amIInDetention && endTurnButton.style.display === 'none' && buyPropertyButton.style.display === 'none' && developPropertyButton.style.display === 'none') {
                    rollDiceButton.classList.add('pulsing');
                } else {
                    rollDiceButton.classList.remove('pulsing');
                }
                if (rolledDoubles && doublesCount > 0 && doublesCount < 3 && gameStatusMessageP) {
                    gameStatusMessageP.textContent = `${myPlayerState.name} rolled doubles! Roll again.`;
                }
            } else {
                rollDiceButton.classList.remove('pulsing'); // Ensure pulsing is removed if not the primary action
            }

            let showOptionalActions = false;
            // Optional actions (buy/develop) are available only AFTER the main roll action is taken for this segment of the turn,
            // OR if playerActionTakenThisTurn is true from a previous part of a multi-roll turn.
            if (myPlayerActionTakenThisTurn || gameData.lastDiceRoll) { // Simpler: if action is taken OR a roll just happened
                showOptionalActions = true;
            }


            if (showOptionalActions) {
                otherActionsContainer.style.display = 'block';
                const currentSpace = gameData.boardLayout[myPlayerState.position];
                const propData = Array.isArray(gameData.propertyData) ? gameData.propertyData.find(p => p.id === currentSpace?.id) : null;

                if (currentSpace && propData && (currentSpace.type === 'property' || currentSpace.type === 'set_property') && 
                    (propData.owner === null || (gameData.players[propData.owner]?.isBankrupt))) {
                    let price = currentSpace.price;
                    if (myPlayerState.hasHousingVoucher && currentSpace.type === 'property') {
                        price = Math.round(price * 0.75);
                    }
                    buyPropertyPriceSpan.textContent = price;
                    buyPropertyButton.style.display = (myPlayerState.money >= price) ? 'inline-block' : 'none';
                    if (buyPropertyButton.style.display === 'inline-block') {
                        buyPropertyButton.disabled = false;
                        // Auto-buy if enabled
                        if (autoBuyEnabled && myPlayerState.money >= price) {
                            handleBuyPropertyAction();
                        }
                        // Set button color to match player color
                        const playerColor = playerColors[myPlayerState.order % playerColors.length];
                        buyPropertyButton.style.backgroundColor = playerColor;
                        buyPropertyButton.style.borderColor = playerColor;
                    }
                } else {
                    buyPropertyButton.style.display = 'none';
                }

                developPropertyButton.style.display = canPlayerDevelopAnyProperty(myPlayerState, gameData) ? 'inline-block' : 'none';
                if (developPropertyButton.style.display === 'inline-block') {
                    developPropertyButton.disabled = false;
                }

                if (buyPropertyButton.style.display === 'none' && developPropertyButton.style.display === 'none') {
                    otherActionsContainer.style.display = 'none'; // Hide container if no optional actions
                }
            }

            // End Turn button appears if the player has taken their action for this turn segment
            // AND they are not obligated to roll again due to doubles.
            if (myPlayerActionTakenThisTurn && !(rolledDoubles && doublesCount > 0 && doublesCount < 3) ) {
                endTurnButton.style.display = 'block';
                endTurnButton.disabled = false;
                endTurnButton.classList.add('main-action-button');
                rollDiceButton.classList.remove('pulsing'); // Remove pulsing from roll if end turn is now available
            }

            // Auto-roll dice logic (relies on button states set above)
            // Clear any existing auto-roll timeout at the start of this evaluation IF it's my turn
            // (Moved clearing to earlier in the function, this is just the check)
            if (autoRollDiceTimeout && !isMyTurn) {
                clearTimeout(autoRollDiceTimeout);
                autoRollDiceTimeout = null;
            }

            const noMandatoryRollPending = !((myPlayerState.doublesRolledInTurn || 0) > 0 && (myPlayerState.doublesRolledInTurn || 0) < 3 && !myPlayerActionTakenThisTurn);
            const noOptionalActionsAvailable = buyPropertyButton.style.display === 'none' && developPropertyButton.style.display === 'none';
            const noCardActionPending = cardDisplayContainer.style.display === 'none' && (!onBoardCardDisplayDiv || onBoardCardDisplayDiv.style.display === 'none');

            // Auto-end turn (original logic)
            if (myPlayerActionTakenThisTurn && noMandatoryRollPending && noOptionalActionsAvailable && noCardActionPending) {
                logEvent("Auto-ending turn conditions met. Setting timeout.");
                setTimeout(() => {
                    const freshLocalDataForAutoEnd = localGameData;
                    if (freshLocalDataForAutoEnd && freshLocalDataForAutoEnd.players && freshLocalDataForAutoEnd.players[currentUserId]) {
                        const stillMyTurnNow = freshLocalDataForAutoEnd.playerOrder[freshLocalDataForAutoEnd.currentPlayerIndex] === currentUserId;
                        const playerStateNow = freshLocalDataForAutoEnd.players[currentUserId];

                        const noRollPendingNow = !((playerStateNow.doublesRolledInTurn || 0) > 0 && (playerStateNow.doublesRolledInTurn || 0) < 3 && !playerStateNow.playerActionTakenThisTurn);
                        const noOptionsNow = document.getElementById('buy-property-button').style.display === 'none' &&
                            document.getElementById('develop-property-button').style.display === 'none';
                        const noCardNow = document.getElementById('card-display-container').style.display === 'none' &&
                            (!document.getElementById('on-board-card-display') || document.getElementById('on-board-card-display').style.display === 'none');

                        if (stillMyTurnNow && playerStateNow.playerActionTakenThisTurn && noRollPendingNow && noOptionsNow && noCardNow) {
                            logEvent("Auto-end conditions still met in timeout. Calling handleEndTurnAction.");
                            handleEndTurnAction();
                        } else {
                            logEvent("Auto-end conditions changed during timeout or not my turn anymore. Not auto-ending.");
                        }
                    } else {
                        logEvent("Auto-end timeout: Could not get fresh player data. Not auto-ending.");
                    }
                }, 1500);
            }

            // Auto-roll dice (new logic, revised conditions)
            const canAutoRoll = isMyTurn &&
                                !amIAI &&
                                !amIInDetention &&
                                rollDiceButton.style.display === 'block' && !rollDiceButton.disabled && // Roll dice must be the available action
                                (buyPropertyButton.style.display === 'none' || buyPropertyButton.disabled === true) && // No buy
                                (developPropertyButton.style.display === 'none' || developPropertyButton.disabled === true) && // No develop
                                (detentionActionsDiv.innerHTML.trim() === '') && // No detention actions
                                (cardDisplayContainer.style.display === 'none') && // No main card modal
                                (!onBoardCardDisplayDiv || onBoardCardDisplayDiv.style.display === 'none') && // No on-board card modal
                                endTurnButton.style.display === 'none' && // Critically, End Turn is NOT yet an option
                                (!myPlayerActionTakenThisTurn || (rolledDoubles && doublesCount > 0 && doublesCount < 3)); // Roll is pending

            if (canAutoRoll) {
                if (!autoRollDiceTimeout) { // Start timeout only if not already running
                    logEvent(`Auto-roll dice conditions met. Setting ${AUTO_ROLL_DELAY_MS}ms timeout.`);
                    autoRollDiceTimeout = setTimeout(() => {
                        logEvent("Auto-roll dice timeout fired.");
                        const freshLocalDataForAutoRoll = localGameData;
                        if (freshLocalDataForAutoRoll && freshLocalDataForAutoRoll.players && freshLocalDataForAutoRoll.players[currentUserId]) {
                            const stillMyTurnNow = freshLocalDataForAutoRoll.playerOrder[freshLocalDataForAutoRoll.currentPlayerIndex] === currentUserId;
                            const playerStateNow = freshLocalDataForAutoRoll.players[currentUserId];
                            const rolledDoublesNow = freshLocalDataForAutoRoll.lastDiceRoll?.isDoubles;
                            const doublesCountNow = playerStateNow.doublesRolledInTurn || 0;

                            const canStillAutoRollNow = stillMyTurnNow &&
                                !playerStateNow.isAI &&
                                !playerStateNow.inDetention &&
                                document.getElementById('roll-dice-button').style.display === 'block' && !document.getElementById('roll-dice-button').disabled &&
                                (document.getElementById('buy-property-button').style.display === 'none' || document.getElementById('buy-property-button').disabled === true) &&
                                (document.getElementById('develop-property-button').style.display === 'none' || document.getElementById('develop-property-button').disabled === true) &&
                                (document.getElementById('detention-actions').innerHTML.trim() === '') &&
                                (document.getElementById('card-display-container').style.display === 'none') &&
                                (!document.getElementById('on-board-card-display') || document.getElementById('on-board-card-display').style.display === 'none') &&
                                document.getElementById('end-turn-button').style.display === 'none' &&
                                (!playerStateNow.playerActionTakenThisTurn || (rolledDoublesNow && doublesCountNow > 0 && doublesCountNow < 3));

                            if (canStillAutoRollNow) {
                                logEvent("Auto-roll conditions still met. Calling handleRollDiceAction.");
                                handleRollDiceAction(true); // Pass true for auto-roll
                            } else {
                                logEvent("Auto-roll conditions no longer met at time of timeout execution.");
                            }
                        }
                        autoRollDiceTimeout = null;
                    }, AUTO_ROLL_DELAY_MS);
                }
            } else {
                // If conditions for auto-roll are not met, and a timeout exists, clear it.
                if (autoRollDiceTimeout) {
                    clearTimeout(autoRollDiceTimeout);
                    autoRollDiceTimeout = null;
                    logEvent("Auto-roll conditions no longer met, cleared existing timeout.");
                }
            }
        }
    }
}

function updatePreGameRollUI(gameData) {
    if (!preGameRollArea || !preGameRollButton || !preGameRollResultsDiv || !gameData.players) {
        logEvent("updatePreGameRollUI: Missing DOM elements or player data.");
        return;
    }

    const allExpectedHumansJoined = Object.values(gameData.players).filter(p => !p.isAI).length >= gameData.numHumanPlayers;
    if (!gameData.preGamePhase || gameData.status !== "active" || !allExpectedHumansJoined || gameData.playerOrder.length < gameData.maxPlayers) {
        preGameRollArea.style.display = 'none';
        preGameRollButton.style.display = 'none';
        return;
    }

    preGameRollArea.style.display = 'flex';
    preGameRollResultsDiv.innerHTML = '';
    preGameRollButton.style.display = 'none';

    let allPlayerIdsInOrder = gameData.playerOrder || [];
    let preGameRollsData = gameData.preGameRolls || {};
    let numberOfPlayers = allPlayerIdsInOrder.length;

    let rolledPlayerCount = 0;
    allPlayerIdsInOrder.forEach(pid => {
        const player = gameData.players[pid];
        if (!player) return;
        const playerName = `${player.name}${player.isAI ? " (AI)" : ""}`;
        const playerOrderForColor = player.order;
        const playerColor = (typeof playerOrderForColor !== 'undefined') ? playerColors[playerOrderForColor % playerColors.length] : '#ecf0f1';

        if (preGameRollsData[pid] !== undefined) {
            preGameRollResultsDiv.innerHTML += `<span style="color:${playerColor};">${playerName}</span> rolled: ${preGameRollsData[pid]}<br>`;
            rolledPlayerCount++;
        } else {
            preGameRollResultsDiv.innerHTML += `<span style="color:${playerColor};">${playerName}</span> has not rolled yet.<br>`;
        }
    });

    if (rolledPlayerCount === numberOfPlayers && numberOfPlayers > 0 && numberOfPlayers === gameData.maxPlayers) {
        preGameRollResultsDiv.innerHTML += "All players rolled. Host is determining start order...";
    } else if (numberOfPlayers > 0 && numberOfPlayers === gameData.maxPlayers) {
        let nextPlayerToRollId = null;
        const sortedByJoinOrder = [...allPlayerIdsInOrder].sort((a,b) => (gameData.players[a]?.order || 0) - (gameData.players[b]?.order || 0));

        for (const pid of sortedByJoinOrder) {
            if (preGameRollsData[pid] === undefined) {
                nextPlayerToRollId = pid;
                break;
            }
        }

        const nextPlayerToRollData = gameData.players[nextPlayerToRollId];
        if (nextPlayerToRollId === currentUserId && !nextPlayerToRollData.isAI) { // Only human players click the button
            preGameRollButton.style.display = 'block';
            preGameRollButton.textContent = `Hey > , ${nextPlayerToRollData.name}, CLICK to Start`;
            preGameRollButton.disabled = false;
        } else if (nextPlayerToRollData) {
            const nextPlayerToRollName = `${nextPlayerToRollData.name}${nextPlayerToRollData.isAI ? " (AI)" : ""}`;
            preGameRollButton.style.display = 'block';
            preGameRollButton.textContent = `Waiting for ${nextPlayerToRollName} to roll...`;
            preGameRollButton.disabled = true;
        } else if (rolledPlayerCount < numberOfPlayers) {
            preGameRollButton.style.display = 'block';
            preGameRollButton.textContent = `Waiting for players to roll...`;
            preGameRollButton.disabled = true;
        }
    } else {
        preGameRollResultsDiv.innerHTML = "Waiting for all players to join before starting rolls...";
    }
}

function updateUkGovDisplay(govMoney, gameData) {
    const ukGovStatusDiv = document.getElementById('uk-gov-status');
    if (!ukGovStatusDiv || !gameData || !gameData.players || !gameData.playerOrder) return;

    // Remove everything
    ukGovStatusDiv.innerHTML = '';

    // Container for evenly spaced tokens
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-evenly';
    row.style.alignItems = 'center';
    row.style.gap = '0px';
    row.style.width = '100%';

    gameData.playerOrder.forEach(pid => {
        const player = gameData.players[pid];
        if (!player || player.isBankrupt) return;
        const playerToken = playerEmojis[player.order % playerEmojis.length];
        const playerColor = playerColors[player.order % playerColors.length];
        // Find all developable sets (exclude black/none/utility/railroad)
        const developableGroups = new Set();
        if (Array.isArray(gameData.propertyData) && Array.isArray(gameData.boardLayout)) {
            // Get all groupIds for this player's properties
            const groupIds = [...new Set(player.propertiesOwned.map(propId => {
                const propLayout = gameData.boardLayout.find(s => s.id === propId);
                return propLayout && propLayout.type === 'property' ? propLayout.groupId : null;
            }).filter(gid => gid && propertyColorMap[gid] && propertyColorMap[gid] !== '#000000' && gid !== 'none'))];
            groupIds.forEach(groupId => {
                // Check if player owns all in group
                const groupPropertiesLayout = gameData.boardLayout.filter(s => s.groupId === groupId && s.type === 'property');
                const ownsAllInGroup = groupPropertiesLayout.length > 0 && groupPropertiesLayout.every(gpLayout => {
                    const gpDataForCheck = gameData.propertyData.find(pd => pd.id === gpLayout.id);
                    return gpDataForCheck && gpDataForCheck.owner === player.id;
                });
                if (ownsAllInGroup) {
                    developableGroups.add(groupId);
                }
            });
        }
        // Build the player token + color marks
        const playerDiv = document.createElement('div');
        playerDiv.style.display = 'flex';
        playerDiv.style.flexDirection = 'column';
        playerDiv.style.alignItems = 'center';
        playerDiv.style.justifyContent = 'center';
        playerDiv.style.gap = '2px';
        // Token
        const tokenSpan = document.createElement('span');
        tokenSpan.style.fontSize = '1.1em';
        tokenSpan.style.color = playerColor;
        tokenSpan.textContent = playerToken;
        playerDiv.appendChild(tokenSpan);
        // Color marks for developable sets
        if (developableGroups.size > 0) {
            const colorRow = document.createElement('div');
            colorRow.style.display = 'flex';
            colorRow.style.gap = '2px';
            developableGroups.forEach(groupId => {
                const block = document.createElement('div');
                block.className = 'color-block';
                block.style.backgroundColor = propertyColorMap[groupId];
                block.style.width = '10px';
                block.style.height = '10px';
                colorRow.appendChild(block);
            });
            playerDiv.appendChild(colorRow);
        }
        row.appendChild(playerDiv);
    });
    ukGovStatusDiv.appendChild(row);
}

function updateCurrentPlayerBoardInfo(gameData) {
    const tokenEl = document.getElementById('current-player-token-display');
    const colorContainer = document.getElementById('owned-color-blocks');
    if (!tokenEl || !colorContainer || !gameData || !gameData.players || !gameData.playerOrder) return;

    const currentId = gameData.playerOrder[gameData.currentPlayerIndex];
    const player = gameData.players[currentId];
    if (!player) return;

    const tokenEmoji = playerEmojis[player.order % playerEmojis.length];
    const tokenColor = playerColors[player.order % playerColors.length];
    tokenEl.textContent = tokenEmoji;
    tokenEl.style.color = tokenColor;
    tokenEl.style.filter = `drop-shadow(0 0 4px ${tokenColor})`;

    colorContainer.innerHTML = '';
    if (Array.isArray(gameData.propertyData)) {
        const ownedColors = new Set();
        gameData.propertyData.forEach(p => {
            if (p.owner === player.id && propertyColorMap[p.groupId]) {
                ownedColors.add(p.groupId);
            }
        });
        ownedColors.forEach(colorKey => {
            const block = document.createElement('div');
            block.className = 'color-block';
            block.style.backgroundColor = propertyColorMap[colorKey];
            colorContainer.appendChild(block);
        });
    }
}

function handleGameEndUI(gameData) {
    if (!gameStatusMessageP || !currentTurnDisplay || !rollDiceButton || !endTurnButton || !buyPropertyButton || !developPropertyButton || !preGameRollArea || !otherActionsContainer) return;

    gameStatusMessageP.textContent = gameData.lastActionMessage || "Game Over!";
    currentTurnDisplay.textContent = "Game Over!";
    currentTurnDisplay.style.color = '#e74c3c';

    rollDiceButton.style.display = 'none';
    endTurnButton.style.display = 'none';
    buyPropertyButton.style.display = 'none';
    developPropertyButton.style.display = 'none';
    preGameRollArea.style.display = 'none';
    detentionActionsDiv.innerHTML = '';

    otherActionsContainer.style.display = 'block';
    otherActionsContainer.innerHTML = '<button id="leave-game-button" style="background-color:#c0392b;">Back to Setup</button>';
    const leaveButton = document.getElementById('leave-game-button');
    if (leaveButton) {
        leaveButton.onclick = () => {
            if (unsubscribeGameState) unsubscribeGameState();
            // Clear chat messages when leaving game
            const chatMessagesDiv = document.getElementById('chat-messages');
            if (chatMessagesDiv) chatMessagesDiv.innerHTML = '';
            resetToSetupScreen();
        };
    }
}

function setupBoardFromFirestore(gameData) {
    if (!boardContainer) {
        logEvent("Error: boardContainer DOM element not found in setupBoardFromFirestore.");
        return;
    }
    boardContainer.innerHTML = '';

    if (gameData.boardLayout && gameData.boardLayout.length > 0) {
        boardLayout = gameData.boardLayout;
    } else {
        logEvent("setupBoardFromFirestore: gameData.boardLayout is missing or empty. Calling reformatBoardLayout.");
        reformatBoardLayout(); // Ensure boardLayout is populated if missing from Firestore
    }

    const dcSpace = boardLayout.find(s => s.name === "Detention Center");
    detentionCenterSpaceId = dcSpace ? dcSpace.id : (boardLayout.find(s => s.type === "detention_visiting")?.id || 10);

    const cardDecksCenter = document.createElement('div');
    cardDecksCenter.id = 'card-decks-center';
    const centerImage = document.createElement('img');
    centerImage.id = 'center-board-image';
    centerImage.src = 'images/nigel.png';
    centerImage.alt = 'Migrantopoly Center';
    cardDecksCenter.appendChild(centerImage);
    boardContainer.appendChild(cardDecksCenter);

    const onBoardCardDiv = document.createElement('div');
    onBoardCardDiv.id = 'on-board-card-display';
    onBoardCardDiv.style.display = 'none';
    onBoardCardDiv.innerHTML = `
        <h4 id="on-board-card-type">Card Type</h4>
        <p id="on-board-card-text">Card text will appear here.</p>
        <button id="on-board-card-ok-button">OK</button>
    `;
    boardContainer.appendChild(onBoardCardDiv);
    onBoardCardDisplayDiv = document.getElementById('on-board-card-display');
    onBoardCardTypeH4 = document.getElementById('on-board-card-type');
    onBoardCardTextP = document.getElementById('on-board-card-text');

    boardLayout.forEach((s) => {
        const spaceDiv = document.createElement('div');
        spaceDiv.id = `space-${s.id}`;
        spaceDiv.classList.add('space');
        if (s.type === 'go' || s.type === 'detention_visiting' || s.type === 'go_to_detention' || s.type === 'crime_spree') {
            spaceDiv.classList.add('corner');
        }
        if (['Fake PIP declined', 'Fake ID Cards', "Payout: Job Seeker's"].includes(s.name)) {
            spaceDiv.classList.add('yellow-boardname');
        }

        // Add wheelchair icon for PIP space
        if (s.name === 'Fake PIP declined') {
            const wheelchairIcon = document.createElement('div');
            wheelchairIcon.classList.add('wheelchair-icon');
            wheelchairIcon.innerHTML = '♿';
            spaceDiv.appendChild(wheelchairIcon);
        }

        // Add driving license icon for Fake ID space
        if (s.name === 'Fake ID Cards') {
            const licenseIcon = document.createElement('div');
            licenseIcon.classList.add('license-icon');
            licenseIcon.innerHTML = '🪪';
            spaceDiv.appendChild(licenseIcon);
        }

        // Add DWP icon specifically for the Job Seeker payout space
        if (s.name === "Payout: Job Seeker's") {
            const dwpIconDiv = document.createElement('div');
            dwpIconDiv.classList.add('dwp-icon');
            dwpIconDiv.textContent = 'DWP';
            spaceDiv.appendChild(dwpIconDiv);
        }

        if (s.name === "Dole" && s.type === "go"){
            spaceDiv.classList.add('dole-space');
            const doleSign = document.createElement('div');
            doleSign.classList.add('dole-sign');
            doleSign.textContent = `£${GO_BONUS}`;
            spaceDiv.appendChild(doleSign);
        }
        if (s.name === 'Detention Center') {
            const bars = document.createElement('div'); bars.className = 'detention-bars';
            for (let b = 0; b < 6; b++) { const bar = document.createElement('div'); bar.className = 'detention-bar'; bars.appendChild(bar); }
            spaceDiv.appendChild(bars);
        }
        if (s.name === 'Go to Detention Center') {
            const arrow = document.createElement('div'); arrow.className = 'detention-arrow'; arrow.textContent = '→'; spaceDiv.appendChild(arrow);
            const subLabel = document.createElement('div'); subLabel.className = 'sub-label'; subLabel.textContent = ''; spaceDiv.appendChild(subLabel);
        }
        if (s.type === 'property') {
            spaceDiv.classList.add('property', s.color || s.groupId);
            const colorBar = document.createElement('div'); colorBar.classList.add('color-bar');
            if (["Tesco Cardboard Skip 1", "Tesco Cardboard Skip 2", "Tesco Cardboard Skip 3"].includes(s.name)) {
                colorBar.style.backgroundColor = '#2196f3';
            }
            spaceDiv.appendChild(colorBar);
        } else if (s.type === 'set_property') {
            spaceDiv.classList.add('set-property');
        } else if (s.type === 'opportunity' || s.type === 'welfare') {
            spaceDiv.classList.add('card-space'); // Add a class for general card space styling
            spaceDiv.style.backgroundColor = 'grey'; // Grey background for card spaces
        }
        // Add icons for welfare and opportunity cards (before nameDiv)
        let cardIcon = null;
        if (s.type === 'welfare') {
            cardIcon = document.createElement('div');
            cardIcon.className = 'card-icon nhs-icon';
            cardIcon.innerHTML = '<i class="fas fa-money-bill-wave"></i>'; // Added cash icon
        } else if (s.type === 'opportunity') {
            cardIcon = document.createElement('div');
            cardIcon.className = 'card-icon';
            cardIcon.innerHTML = '<i class="fas fa-money-bill-wave"></i>'; // Added cash icon
        }
        if (cardIcon) {
            spaceDiv.appendChild(cardIcon); // temporarily add to end
        }
        const nameDiv = document.createElement('div'); nameDiv.classList.add('name');
        if (s.name === 'Detention Center') nameDiv.classList.add('detention-center-name');
        // --- Style for Crime Spree name ---
        if (s.type === 'crime_spree') {
            nameDiv.classList.add('crime-spree-name');
        }
        // --- Style for Go to Detention Center name ---
        if (s.name === 'Go to Detention Center') {
            nameDiv.classList.add('go-to-detention-name');
        }
        nameDiv.textContent = s.name;
        spaceDiv.appendChild(nameDiv);
        // Add icons for welfare and opportunity cards (after nameDiv)
        if (cardIcon) {
            spaceDiv.appendChild(cardIcon);
        }
        if (s.name === 'Detention Center') {
            nameDiv.style.color = 'red';
            nameDiv.style.position = 'relative';
            nameDiv.style.zIndex = '10'; // Ensure above bars
            nameDiv.style.fontWeight = 'bold';
            nameDiv.style.textShadow = '1px 1px 2px #fff, 0 0 2px #fff'; // White outline for contrast
            nameDiv.style.background = 'rgba(255,255,255,0.01)'; // Transparent background to help stacking
        }

        // Style for DOLE (GO) space
        if (s.type === 'go') { // Dole is type 'go'
            nameDiv.style.color = 'red';
        }

        if (s.type === 'opportunity' || s.type === 'welfare') {
            nameDiv.style.color = 'white'; // Set font color to white
            nameDiv.style.fontSize = '1.1em'; // Make font a tiny bit larger
        }
        spaceDiv.appendChild(nameDiv);
        
        if (s.type === 'property' && s.rent) {
            const devIndicator = document.createElement('div');
            devIndicator.classList.add('development-indicator');
            devIndicator.id = `dev-indicator-${s.id}`;
            spaceDiv.appendChild(devIndicator);
        }
        if (s.price) {
            const priceDiv = document.createElement('div'); priceDiv.classList.add('price');
            priceDiv.textContent = `£${s.price}`;
            priceDiv.style.fontSize = '0.9em'; // Make price font slightly larger
            spaceDiv.appendChild(priceDiv);
        }
        if (s.type === 'property' || s.type === 'set_property') {
            const ownerIndicator = document.createElement('div');
            ownerIndicator.classList.add('owner-indicator');
            ownerIndicator.id = `owner-indicator-${s.id}`;
            spaceDiv.appendChild(ownerIndicator);
        }

        const currentId = s.id;
        if (currentId === 0) { spaceDiv.style.gridArea = `1 / 1`; } 
        else if (currentId >= 1 && currentId <= 9) { spaceDiv.style.gridArea = `1 / ${currentId + 1}`; } 
        else if (currentId === 10) { spaceDiv.style.gridArea = `1 / 11`; } 
        else if (currentId >= 11 && currentId <= 19) { spaceDiv.style.gridArea = `${(currentId - 10) + 1} / 11`; } 
        else if (currentId === 20) { spaceDiv.style.gridArea = `11 / 11`; } 
        else if (currentId >= 21 && currentId <= 29) { spaceDiv.style.gridArea = `11 / ${11 - (currentId - 20)}`; } 
        else if (currentId === 30) { spaceDiv.style.gridArea = `11 / 1`; } 
        else if (currentId >= 31 && currentId <= 39) { spaceDiv.style.gridArea = `${11 - (currentId - 30)} / 1`; }

        // Add property icon, but skip for special spaces
        const skipIconTypes = ['crime_spree', 'go_to_detention', 'detention_visiting', 'go'];
        const skipIconNames = ["Payout: Job Seeker's"];
        if ((s.type === 'property' || s.type === 'set_property') && !skipIconTypes.includes(s.type) && !skipIconNames.includes(s.name)) {
            const iconDiv = document.createElement('div');
            iconDiv.classList.add('property-icon');
            if (s.groupId === 'darkgrey') {
                iconDiv.innerHTML = '<i class="fas fa-smoking"></i>';
            } else if (s.name.includes('Gypsy Estate')) {
                iconDiv.innerHTML = '<i class="fas fa-caravan"></i>';
            } else if (s.name.includes('Tent in Field')) {
                iconDiv.innerHTML = '<i class="fas fa-campground"></i>';
            } else if (s.name.includes('Tesco Cardboard Skip')) {
                iconDiv.innerHTML = '<i class="fas fa-dumpster"></i>';
            } else if (s.name.toLowerCase().includes('boat sank')) {
                iconDiv.innerHTML = '<i class="fas fa-ship"></i>';
            } else if (s.name.toLowerCase().includes('black market')) {
                iconDiv.innerHTML = '<i class="fas fa-wine-bottle"></i>';
            } else if (s.name.toLowerCase().includes('council highrise')) {
                iconDiv.innerHTML = '<i class="fas fa-building"></i>';
            } else if (s.type === 'property') {
                iconDiv.innerHTML = '<i class="fas fa-home"></i>';
            } else if (s.type === 'set_property') {
                iconDiv.innerHTML = '<i class="fas fa-users"></i>';
            } else {
                iconDiv.innerHTML = '<i class="fas fa-question"></i>';
            }
            spaceDiv.appendChild(iconDiv);
        }

        // For general single-click info or other non-swap actions
        spaceDiv.addEventListener('click', (e) => {
            handlePropertyCardClick(s, spaceDiv, localGameData);
        });
        // For swap initiation
        spaceDiv.addEventListener('dblclick', (e) => {
            handlePropertyCardDoubleClick(s, spaceDiv, localGameData); // Pass current localGameData
        });

        // --- Add double-tap for mobile ---
        let lastTap = 0;
        spaceDiv.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) { // 300ms threshold for double tap
                e.preventDefault(); // Prevent zoom or other unwanted touch actions
                handlePropertyCardDoubleClick(s, spaceDiv, localGameData);
                lastTap = 0; // Reset lastTap to prevent further immediate triggers
            } else {
                lastTap = currentTime;
            }
        });
        // --- End double-tap for mobile ---

        boardContainer.appendChild(spaceDiv);
    });

    if (gameData.players && gameData.playerOrder) {
        Object.values(gameData.players).forEach(player => {
            if (player && typeof player.id !== 'undefined' && typeof player.order !== 'undefined') {
                let token = document.getElementById(`player-token-${player.id}`);
                if (!token) {
                    token = document.createElement('div');
                    token.id = `player-token-${player.id}`;
                    token.classList.add('player-token');
                }
                token.textContent = playerEmojis[player.order % playerEmojis.length];
                const playerTokenColor = playerColors[player.order % playerColors.length];
                token.style.color = playerTokenColor;
                token.style.filter = `drop-shadow(0 0 4px ${playerTokenColor})`;

                const spaceToPlace = document.getElementById(`space-${player.position}`);
                if (spaceToPlace) {
                        spaceToPlace.appendChild(token);
                } else {
                    logEvent(`Warning: Could not find space-${player.position} to place token for ${player.name}`);
                    const goSpace = document.getElementById('space-0');
                    if (goSpace) goSpace.appendChild(token);
                }
            } else {
                logEvent("Warning: Invalid player data in setupBoardFromFirestore, skipping token creation/update.", player);
            }
        });
    } else {
        logEvent("Warning: gameData.players or gameData.playerOrder is missing in setupBoardFromFirestore. Tokens not created.");
    }
    updateBoardDynamicElements(gameData);
}

function updateBoardDynamicElements(gameData) {
    if (!gameData || !gameData.players || !gameData.boardLayout) {
        logEvent("updateBoardDynamicElements: Missing critical gameData. Skipping updates.");
        return;
    }

    Object.values(gameData.players).forEach(player => {
        if (!player || typeof player.id === 'undefined') {
            // logEvent("updateBoardDynamicElements: Invalid player object in players list.", player); // Can be noisy
            return;
        }
        const token = document.getElementById(`player-token-${player.id}`);
        if (token) {
            if (player.isBankrupt) {
                token.style.display = 'none';
            } else {
                token.style.display = 'block';
                const currentSpaceEl = document.getElementById(`space-${player.position}`);
                if (currentSpaceEl) {
                    if (token.parentNode !== currentSpaceEl) {
                        currentSpaceEl.appendChild(token);
                    }
                } else {
                    // logEvent(`updateBoardDynamicElements: Could not find space-${player.position} for token ${player.id}`); // Can be noisy
                }
            }
        } else {
            // logEvent(`updateBoardDynamicElements: Token not found for player ${player.id}. It should have been created.`); // Can be noisy
        }
    });

    if (Array.isArray(gameData.propertyData)) {
        gameData.propertyData.forEach(propInPropertyData => {
            if (!propInPropertyData || typeof propInPropertyData.id === 'undefined') {
                // logEvent("Warning: Invalid item in propertyData array during UI update, skipping this item.", propInPropertyData); // Can be noisy
                return;
            }

            const ownerIndicator = document.getElementById(`owner-indicator-${propInPropertyData.id}`);
            if (ownerIndicator) {
                if (propInPropertyData.owner && gameData.players[propInPropertyData.owner] && !gameData.players[propInPropertyData.owner].isBankrupt) {
                    const ownerData = gameData.players[propInPropertyData.owner];
                    if (ownerData && typeof ownerData.order !== 'undefined') {
                        const ownerColor = playerColors[ownerData.order % playerColors.length];
                        ownerIndicator.style.backgroundColor = ownerColor;
                    } else {
                        ownerIndicator.style.backgroundColor = 'transparent';
                    }
                } else {
                    ownerIndicator.style.backgroundColor = 'transparent';
                }
            }

            const boardSpaceDetails = gameData.boardLayout.find(s => s.id === propInPropertyData.id);
            if (boardSpaceDetails && boardSpaceDetails.type === 'property') {
                const devIndicator = document.getElementById(`dev-indicator-${propInPropertyData.id}`);
                if (devIndicator) {
                    if (propInPropertyData.permanentResidence) {
                        devIndicator.textContent = "🏢"; // Hotel/PR
                    } else if (propInPropertyData.tenancies > 0) {
                        devIndicator.textContent = "🏠".repeat(propInPropertyData.tenancies); // Houses
                    } else {
                        devIndicator.textContent = "";
                    }
                    if (!propInPropertyData.owner && (propInPropertyData.tenancies > 0 || propInPropertyData.permanentResidence)) {
                        devIndicator.classList.add('development-flash');
                    } else {
                        devIndicator.classList.remove('development-flash');
                    }
                }
            }
        });
    } else {
        logEvent("updateBoardDynamicElements: gameData.propertyData is NOT an array. Property visual updates will be skipped.", gameData.propertyData);
    }

    // --- Property Swap Flashing Update (Synchronized) ---
    document.querySelectorAll('.space.property, .space.set-property').forEach(spaceEl => {
        const spaceId = parseInt(spaceEl.id.replace('space-', ''));
        // Check if gameData.flashingProperties exists and is an array before trying to use .includes()
        if (gameData.flashingProperties && Array.isArray(gameData.flashingProperties) && gameData.flashingProperties.includes(spaceId)) {
            spaceEl.classList.add('property-flash');
        } else {
            spaceEl.classList.remove('property-flash');
        }
    });

    // --- Crack House Smoke Animation Update ---
    document.querySelectorAll('.space.property').forEach(spaceEl => {
        const spaceId = parseInt(spaceEl.id.replace('space-', ''));
        const propData = gameData.propertyData.find(p => p.id === spaceId);
        if (propData && propData.groupId === "darkgrey") {
            const ownerId = propData.owner;
            if (ownerId && gameData.players[ownerId] && !gameData.players[ownerId].isBankrupt) {
                const ownerCrackHouses = gameData.propertyData.filter(p => p.owner === ownerId && p.groupId === "darkgrey");
                if (ownerCrackHouses.length > 1) {
                    if (!spaceEl.querySelector('.smoke-container')) {
                        const smokeContainer = document.createElement('div');
                        smokeContainer.classList.add('smoke-container');
                        for (let i = 0; i < 3; i++) {
                            const smokePuff = document.createElement('div');
                            smokePuff.classList.add('smoke-puff');
                            smokeContainer.appendChild(smokePuff);
                        }
                        spaceEl.appendChild(smokeContainer);
                    }
                } else {
                    const smokeContainer = spaceEl.querySelector('.smoke-container');
                    if (smokeContainer) {
                        smokeContainer.remove();
                    }
                }
            } else {
                const smokeContainer = spaceEl.querySelector('.smoke-container');
                if (smokeContainer) {
                    smokeContainer.remove();
                }
            }
        } else {
            const smokeContainer = spaceEl.querySelector('.smoke-container');
            if (smokeContainer) {
                smokeContainer.remove();
            }
        }
    });

    // Remove player-on-space from all spaces first (undo previous logic)
    // document.querySelectorAll('.space').forEach(spaceEl => {
    //     spaceEl.classList.remove('player-on-space');
    // });
    // Object.values(gameData.players).forEach(player => {
    //     if (player && typeof player.position === 'number' && !player.isBankrupt) {
    //         const spaceEl = document.getElementById(`space-${player.position}`);
    //         if (spaceEl && spaceEl.classList.contains('property')) {
    //             spaceEl.classList.add('player-on-space');
    //         }
    //     }
    // });
}


function showMoneyChangeEffect(amount, type = 'loss') {
    const moneyFlashDivLocal = document.getElementById('money-flash');
    if (!moneyFlashDivLocal) {
        logEvent("showMoneyChangeEffect: money-flash div not found.");
        return;
    }
    if (amount <= 0) return;

    if (type === 'gain') {
        moneyFlashDivLocal.innerHTML = `<span style='font-size:1.2em;'>💰</span> <span style='font-size:0.7em;'>+£${amount}</span>`;
        moneyFlashDivLocal.style.color = '#2ecc71'; // Green for gain
        playCashSound();
    } else if (type === 'loss') {
        moneyFlashDivLocal.innerHTML = `<span style='font-size:1.2em;'>💸</span> <span style='font-size:0.7em;'>-£${amount}</span>`;
        moneyFlashDivLocal.style.color = '#e74c3c'; // Red for loss
        playDullSound();
    }

    moneyFlashDivLocal.classList.remove('show'); // Reset animation
    void moneyFlashDivLocal.offsetWidth; // Trigger reflow to restart animation
    moneyFlashDivLocal.classList.add('show'); // Start animation

    setTimeout(() => {
        moneyFlashDivLocal.classList.remove('show');
    }, 900); // Slightly longer than animation duration (0.7s) to ensure completion
}

// Play cash sound for gaining money
function playCashSound() {
    if (audioContextStarted && typeof Tone !== 'undefined' && Tone.context.state === 'running') {
        const synth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.1 }
        }).toDestination();
        synth.triggerAttackRelease('C5', '16n', Tone.now());
        synth.triggerAttackRelease('E5', '16n', Tone.now() + 0.07);
        synth.triggerAttackRelease('G5', '16n', Tone.now() + 0.14);
        // Clean up synth
        setTimeout(() => {
            if (synth && typeof synth.dispose === 'function') {
                synth.dispose();
            }
        }, 500);
    }
}

// Play dull sound for losing money
function playDullSound() {
    if (audioContextStarted && typeof Tone !== 'undefined' && Tone.context.state === 'running') {
        const synth = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.1 }
        }).toDestination();
        synth.triggerAttackRelease("8n");
        // Clean up synth
        setTimeout(() => {
            if (synth && typeof synth.dispose === 'function') {
                synth.dispose();
            }
        }, 500);
    }
}

function showRentFlashEffect(payerName, recipientName, amount, propertyName, recipientOrder) {
    if (!rentFlashDiv) return;
    
    // Get the recipient's color
    const recipientColor = playerColors[recipientOrder % playerColors.length];
    
    // Create the HTML with colored RENT! text
    rentFlashDiv.innerHTML = `<span style="color: ${recipientColor};">TRESSPASS!</span><br>${payerName} Pays £${amount} To ${recipientName}`;
    rentFlashDiv.classList.add('show');
    setTimeout(() => {
        rentFlashDiv.classList.remove('show');
    }, 2500);
}


// --- MAIN UI UPDATE FUNCTION (Calls helpers) ---
function updateLocalUIFromFirestore(gameData) {
    if (!currentUserId) {
        logEvent("UpdateLocalUI: currentUserId not set yet, deferring UI update.");
        if(gameStatusMessageP) gameStatusMessageP.textContent = "Authenticating...";
        return;
    }

    if (!gameData || Object.keys(gameData).length === 0) {
        logEvent("UpdateLocalUI: No game data received. Cannot update UI.");
        return;
    }

    // Check if we need to finalize pre-game phase
    if (gameData.preGamePhase &&
        gameData.status === "active" &&
        gameData.hostId === currentUserId &&
        gameData.playerOrder && gameData.playerOrder.length === gameData.maxPlayers &&
        gameData.preGameRolls &&
        gameData.playerOrder.every(pid => gameData.preGameRolls[pid] !== undefined)
    ) {
        const allPlayersRolled = gameData.playerOrder.every(pid => gameData.preGameRolls[pid] !== undefined);
        if (allPlayersRolled) {
            logEvent("Host detected conditions to finalize pre-game. Calling finalizePreGameAsHost.");
            finalizePreGameAsHost();
            // Don't return here, continue with UI updates
        }
    }

    if (gameData.boardLayout && gameData.boardLayout.length > 0) {
        const boardIsMissingOrDifferent = boardLayout.length === 0 ||
            (boardContainer && boardContainer.innerHTML.trim() === '') ||
            JSON.stringify(boardLayout) !== JSON.stringify(gameData.boardLayout);
        if (boardIsMissingOrDifferent) {
            logEvent("UpdateLocalUI: Setting up/refreshing board from Firestore data.");
            setupBoardFromFirestore(gameData);
        } else {
            updateBoardDynamicElements(gameData);
        }
    } else {
        logEvent("UpdateLocalUI: gameData.boardLayout is missing or empty. Board not set up/updated.");
    }

    updateDiceUIDisplay(gameData);
    updatePlayerInfoPanel(gameData);
    updateGameStatusPanel(gameData);
    updateControlsBasedOnTurn(gameData);
    updateUkGovDisplay(gameData.ukGovMoney, gameData);
    updateCurrentPlayerBoardInfo(gameData);

    if (gameData.preGamePhase && gameData.status === "active") {
        updatePreGameRollUI(gameData);
        if (currentUserId === gameData.hostId) {
            automateAIPreGameRolls(gameData);
        }
    } else {
        if(preGameRollArea) preGameRollArea.style.display = 'none';
    }

    if (gameData.status === "finished") {
        handleGameEndUI(gameData);
    }
}



// This JavaScript should be part of your game.js or a script loaded
// when your game screen (where the chat is visible) is active.

function setupLocalChatUIToggle() {
    const chatContainer = document.getElementById('chat-container');
    const chatHeaderToggle = document.getElementById('chat-header-toggle');

    if (chatHeaderToggle && chatContainer) {
        // Check if chatHeaderToggle already has a click listener to avoid duplicates
        // This is-a very simple check, more robust checks might be needed if this function can be called multiple times
        if (!chatHeaderToggle.dataset.listenerAttached) {
            chatHeaderToggle.addEventListener('click', () => {
                chatContainer.classList.toggle('minimized');
            });
            chatHeaderToggle.dataset.listenerAttached = 'true'; // Mark as attached
            console.log("Chat toggle listener attached.");
        }
    } else {
        // Log an error if the elements aren't found when expected
        if (!chatHeaderToggle) {
            console.error("[Chat UI] #chat-header-toggle not found in the DOM.");
        }
        if (!chatContainer) {
            console.error("[Chat UI] #chat-container not found in the DOM.");
        }
    }
}



// --- ACTION HANDLERS (Dice, Turn, Property, etc.) ---
async function animatePlayerMove(playerId, startPos, steps, currentBoardLayout) {
    // Check if an animation is already in progress for this player
    if (window._playerMoveAnimationLocks[playerId]) {
        logEvent(`Animation lock: Already animating for ${playerId}, skipping new animation.`);
        return; // Already animating
    }
    window._playerMoveAnimationLocks[playerId] = true; // Set the lock
    logEvent(`Animation lock: Set for ${playerId}`);
    const token = document.getElementById(`player-token-${playerId}`);
    if (!token || !currentBoardLayout || currentBoardLayout.length === 0) {
        window._playerMoveAnimationLocks[playerId] = false; // Release lock if animation can't start
        logEvent(`Animation lock: Released for ${playerId} (no token/board).`);
        return;
    }
    let currentVisualPos = startPos;
    const stepDelay = 200;
    try {
        for (let i = 0; i < steps; i++) {
            currentVisualPos = (currentVisualPos + 1) % currentBoardLayout.length;
            const nextSpaceEl = document.getElementById(`space-${currentVisualPos}`);
            if (nextSpaceEl) {
                nextSpaceEl.appendChild(token);
                token.classList.remove('token-arrive-step');
                void token.offsetWidth;
                token.classList.add('token-arrive-step');
            }
            if (audioContextStarted && toneSynth) {
                try {
                    // Play a short, distinct "ping" sound for each step
                    // Using a new simple Synth for each step to ensure fresh attack/release
                    const stepSynth = new Tone.Synth({
                        oscillator: { type: "sine" }, // A softer sine wave
                        envelope: { attack: 0.01, decay: 0.1, sustain: 0.0, release: 0.1 } // Short, percussive sound
                    }).toDestination();
                    stepSynth.triggerAttackRelease("C5", "16n"); // A C5 note, 16th note duration
                    // Dispose of the synth after a short delay to prevent memory leaks
    setTimeout(() => {
                        if (stepSynth && typeof stepSynth.dispose === 'function') {
                            stepSynth.dispose();
                        }
                    }, 200); // Dispose after the sound is played
                } catch (e) {
                    console.error("Token move sound error:", e);
                }
            }
            await new Promise(resolve => setTimeout(resolve, stepDelay));
        }
    } catch (error) {
        console.error(`Error during animation for ${playerId}:`, error);
    } finally {
        window._playerMoveAnimationLocks[playerId] = false; // Always release the lock
        logEvent(`Animation lock: Released for ${playerId} (animation finished/failed).`);
    }
}

async function makePaymentTransaction(payerId, recipientId, amount, reason = "Payment") {
    logEvent(`makePaymentTransaction initiated: Payer: ${payerId}, Recipient: ${recipientId}, Amount: £${amount}, Reason: ${reason}`);
    if (!currentGameId || !db) {
        logEvent("makePaymentTransaction: Missing gameId or db connection.");
        throw new Error("Game connection error for payment.");
    }
    if (amount <= 0) {
        logEvent("makePaymentTransaction: Amount is zero or negative. No transaction needed.");
        return { success: true, message: "No payment needed (amount was zero or negative)." };
    }

    const gameDocRef = doc(db, "games", currentGameId);
    let paymentOutcome = { success: false, message: "Payment processing failed." };

    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) {
                throw new Error("Game document not found during payment transaction.");
            }
            const freshGameData = freshGameDoc.data();
            let updates = { updatedAt: serverTimestamp() };
            let messages = [];

            const payerState = freshGameData.players[payerId];
            if (!payerState) throw new Error(`Payer ${payerId} not found.`);
            if (payerState.isBankrupt) {
                paymentOutcome = { success: true, message: `${payerState.name} is already bankrupt. No payment collected.`};
                messages.push(paymentOutcome.message);
                updates.lastActionMessage = messages.join(" ");
                transaction.update(gameDocRef, updates);
                return;
            }

            let actualAmountPaid = amount;
            if (payerState.money < amount) {
                actualAmountPaid = payerState.money;
                updates[`players.${payerId}.money`] = 0;
                updates[`players.${payerId}.isBankrupt`] = true;
                messages.push(`${payerState.name} could not afford £${amount} for ${reason}. Paid £${actualAmountPaid} and is now BANKRUPT!`);
                logEvent(`${payerState.name} is bankrupt. Assets need to be handled (future implementation).`);
                // --- Property release on bankruptcy ---
                if (Array.isArray(freshGameData.propertyData)) {
                    const updatedPropertyData = freshGameData.propertyData.map(prop => {
                        if (prop.owner === payerId) {
                            return { ...prop, owner: null };
                        }
                        return prop;
                    });
                    updates.propertyData = updatedPropertyData;
                }
                updates[`players.${payerId}.propertiesOwned`] = [];
            } else {
                updates[`players.${payerId}.money`] = payerState.money - amount;
                messages.push(`${payerState.name} paid £${amount} ${recipientId === 'bank' ? 'to the bank' : `to ${freshGameData.players[recipientId]?.name || 'another player'}`} for ${reason}.`);
            }

            if (recipientId === 'bank') {
                updates.bankMoney = (freshGameData.bankMoney || 0) + actualAmountPaid;
            } else if (recipientId === 'ukGov') {
                updates.ukGovMoney = (freshGameData.ukGovMoney || 0) + actualAmountPaid;
            } else {
                const recipientState = freshGameData.players[recipientId];
                if (!recipientState) throw new Error(`Recipient ${recipientId} not found.`);
                if (!recipientState.isBankrupt) {
                    updates[`players.${recipientId}.money`] = (recipientState.money || 0) + actualAmountPaid;
                } else {
                    messages.push(`Recipient ${recipientState.name} is bankrupt, payment of £${actualAmountPaid} goes to the bank instead.`);
                    updates.bankMoney = (freshGameData.bankMoney || 0) + actualAmountPaid;
                }
            }

            updates.lastActionMessage = messages.join(" ");
            transaction.update(gameDocRef, updates);
            paymentOutcome = { success: true, message: updates.lastActionMessage, payerBankrupt: updates[`players.${payerId}.isBankrupt`] || false };
        });
        logEvent("makePaymentTransaction: Transaction successful.", paymentOutcome);
        // --- NEW: If payer just went bankrupt and it is their turn, auto-end their turn ---
        if (paymentOutcome.payerBankrupt && localGameData && localGameData.playerOrder && localGameData.playerOrder[localGameData.currentPlayerIndex] === payerId) {
            setTimeout(() => { handleEndTurnAction(); }, 500);
        }
        return paymentOutcome;
    } catch (error) {
        console.error("Error during makePaymentTransaction:", error);
        paymentOutcome = { success: false, message: "Payment transaction failed: " + error.message };
        showMessageModal("Payment Error", paymentOutcome.message);
        return paymentOutcome;
    }
}


async function handleRollDiceAction(isAutoRoll = false) {
    rollDiceButton.classList.remove('pulse'); // Remove pulse animation when clicked
    if (autoRollDiceTimeout && !isAutoRoll) { // Clear timeout if dice rolled manually (and this isn't the auto-roll call itself)
        clearTimeout(autoRollDiceTimeout);
        autoRollDiceTimeout = null;
        logEvent("Manually rolled dice, cleared auto-roll timeout.");
    } else if (isAutoRoll && autoRollDiceTimeout) {
        // If this IS the auto-roll call, we expect the timeout to be "live" until it's cleared here or after execution.
        // No action needed for autoRollDiceTimeout here specifically for isAutoRoll, it's cleared after execution or if conditions fail in updateControlsBasedOnTurn or if manual action clears it.
    }
    
    if (!currentGameId || !db) {
        showMessageModal("Error", "Game connection issue.");
        return;
    }
    
    // Get fresh game state before proceeding
    const gameDocRef = doc(db, "games", currentGameId);
    try {
        const freshGameDoc = await getDoc(gameDocRef);
        if (!freshGameDoc.exists()) {
            showMessageModal("Error", "Game not found.");
            return;
        }
        const freshGameData = freshGameDoc.data();
        
        // Check if player is bankrupt
        const playerState = freshGameData.players[currentUserId];
        if (playerState && playerState.isBankrupt) {
            showMessageModal("Bankrupt", "You are bankrupt and cannot take any actions.");
            return;
        }
        
        // Check turn with fresh data
        if (!freshGameData.playerOrder || freshGameData.playerOrder[freshGameData.currentPlayerIndex] !== currentUserId) {
            if (isAutoRoll) { // If it's an auto-roll and not our turn, just stop silently.
                logEvent(`Auto-roll for ${currentUserId} aborted: Not current player's turn anymore. Actual turn: ${freshGameData.playerOrder[freshGameData.currentPlayerIndex]}. Timeout cleared.`);
                return; 
            }
            
            // Check if it's an AI vs AI game
            const currentPlayer = freshGameData.players[freshGameData.playerOrder[freshGameData.currentPlayerIndex]];
            const isAIVsAIGame = currentPlayer && currentPlayer.isAI && playerState && playerState.isAI;
            
            // Only show the message if it's not an AI vs AI game
            if (!isAIVsAIGame) {
                showMessageModal("Not your turn", "It's not your turn to roll the dice.");
            }
            return;
        }
        
        if (freshGameData.preGamePhase) {
            showMessageModal("Game Phase Error", "Cannot roll main dice during pre-game roll phase. Use 'Roll to Start'.");
            return;
        }
        if (freshGameData.gamePhase !== "main") {
            showMessageModal("Game Phase Error", "Cannot roll dice before the main game has started.");
            return;
        }
        
        if (!playerState || playerState.isAI) {
            showMessageModal("Error", "Player data not found or AI cannot use this.");
            return;
        }
        
        if (playerState.playerActionTakenThisTurn && 
            !(freshGameData.lastDiceRoll?.isDoubles && playerState.doublesRolledInTurn < 3 && playerState.doublesRolledInTurn > 0)) {
            showMessageModal("Action Taken", "You've already completed your roll action for this part of the turn.");
            return;
        }
        
        if (playerState.inDetention) {
            showMessageModal("In Detention", "You are in detention. Use detention actions (roll for doubles, pay, or use card).");
            return;
        }
    } catch (error) {
        console.error("Error checking game state:", error);
        showMessageModal("Error", "Could not verify game state: " + error.message);
        return;
    }
    
    if(rollDiceButton) rollDiceButton.disabled = true;
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const totalRoll = die1 + die2;
    let isDoubles = die1 === die2;
    // --- Display dice value immediately ---
    if (diceFace1Elem && diceFace2Elem && diceTotalDisplayText) {
        diceFace1Elem.textContent = die1;
        diceFace2Elem.textContent = die2;
        diceTotalDisplayText.textContent = ` = ${totalRoll}`;
        const diceDisplayContainer = document.getElementById('actual-dice-faces');
        if (diceDisplayContainer) {
            diceDisplayContainer.classList.remove('dice-animation');
            void diceDisplayContainer.offsetWidth;
            diceDisplayContainer.classList.add('dice-animation');
        }
    }
    if (audioContextStarted && toneSynth) {
        try {
            toneSynth.triggerAttackRelease("C4", "16n", Tone.now());
            setTimeout(() => { if (toneSynth) toneSynth.triggerAttackRelease("E4", "16n", Tone.now() + 0.1); }, 100);
        } catch (e) { console.error("Dice roll sound error:", e); }
    }

    // NEW: Handle doubles visual and sound effect
    if (isDoubles) {
        playDoubleSound();
        triggerDicePulseEffect();
    }

    // Optional: Add a small delay so players see dice before movement
    await new Promise(resolve => setTimeout(resolve, 200));
    const playerStartPosForAnim = localGameData.players[currentUserId].position;
    await animatePlayerMove(currentUserId, playerStartPosForAnim, totalRoll, localGameData.boardLayout);

    let landedSpaceIdAfterMove;
    let rentPaymentRequired = false;
    let rentPayerId, rentPropertyId;
    let wasSentToDetentionThisRoll = false; // Flag to check if player went to jail

    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) throw new Error("Game document not found during roll.");
            const freshGameData = freshGameDoc.data();

            const playerState = freshGameData.players[currentUserId];
            if (!playerState || playerState.isBankrupt) throw new Error("Player data missing or bankrupt in Firestore during roll.");
            if (freshGameData.playerOrder[freshGameData.currentPlayerIndex] !== currentUserId) {
                throw new Error("Not your turn (checked in transaction).");
            }
            if (playerState.inDetention) {
                throw new Error("Still in detention (checked in transaction).");
            }

            let newPosition = playerState.position;
            let messages = [];
            let updates = {};

            let currentDoublesCount = playerState.doublesRolledInTurn || 0;
            if (isDoubles) {
                currentDoublesCount++;
            } else {
                currentDoublesCount = 0;
            }
            updates[`players.${currentUserId}.doublesRolledInTurn`] = currentDoublesCount;

            if (isDoubles && currentDoublesCount === 3) {
                messages.push(`${playerState.name} rolled 3 doubles! Sent to Detention.`);
                newPosition = detentionCenterSpaceId;
                updates[`players.${currentUserId}.position`] = newPosition;
                updates[`players.${currentUserId}.inDetention`] = true;
                updates[`players.${currentUserId}.missedTurnsInDetention`] = 0;
                updates[`players.${currentUserId}.playerActionTakenThisTurn`] = true;
                updates[`players.${currentUserId}.doublesRolledInTurn`] = 0;
                updates[`players.${currentUserId}.attemptedDetentionRollThisStay`] = false; // Reset for new detention stay
                landedSpaceIdAfterMove = newPosition;
                wasSentToDetentionThisRoll = true; // Player sent to detention
                updates.detentionTransactionId = Date.now(); // Add marker for detention transaction
            } else {
                newPosition = (playerState.position + totalRoll) % freshGameData.boardLayout.length;
                updates[`players.${currentUserId}.position`] = newPosition;
                landedSpaceIdAfterMove = newPosition;
                const landedSpace = freshGameData.boardLayout[newPosition];
                
                // Play wives sound if landed on specific properties
                if (landedSpace.name === "I Dont speak English" || 
                    landedSpace.name === "Child Wives" || 
                    landedSpace.name === "Forced Marriage" || 
                    landedSpace.name === "Black Market Sales") {
                    playWivesSound();
                }
                
                // Play market sound if landed on Black Market Sales
                if (landedSpace.name === "Black Market Sales") {
                    playMarketSound();
                }
                
                // Play glug sound if landed on boat sank
                if (landedSpace.name === "Boat Sank After Renting") {
                    playGlugSound();
                }
                
                messages.push(`${playerState.name} rolled ${totalRoll} (${die1}, ${die2})${isDoubles ? " (Doubles!)" : ""}. Moved to ${landedSpace.name}.`);

                let passedGo = false;
                if (playerState.position + totalRoll >= freshGameData.boardLayout.length && !(isDoubles && currentDoublesCount ===3) && !playerState.inDetention ) {
                    passedGo = true;
                }
                if (passedGo) {
                    updates[`players.${currentUserId}.money`] = (playerState.money || 0) + GO_BONUS;
                    updates.ukGovMoney = (freshGameData.ukGovMoney || 0) - GO_BONUS;
                    updates[`players.${currentUserId}.govReceived`] = (playerState.govReceived || 0) + GO_BONUS;
                    messages.push(`${playerState.name} passed Dole and collected £${GO_BONUS}.`);

                    // Play token specific sound
                    playTokenSoundForPlayer(playerState);

                    // Show money gain effect
                    showMoneyChangeEffect(GO_BONUS, 'gain');
                }

                if (landedSpace.type === 'payout' && landedSpace.amount) {
                    const currentMoney = updates[`players.${currentUserId}.money`] !== undefined ? updates[`players.${currentUserId}.money`] : playerState.money;
                    updates[`players.${currentUserId}.money`] = currentMoney + landedSpace.amount;
                    updates.ukGovMoney = (updates.ukGovMoney !== undefined ? updates.ukGovMoney : freshGameData.ukGovMoney) - landedSpace.amount;
                    updates[`players.${currentUserId}.govReceived`] = (updates[`players.${currentUserId}.govReceived`] || playerState.govReceived || 0) + landedSpace.amount;
                    messages.push(`${playerState.name} collected £${landedSpace.amount} from ${landedSpace.name}.`);
                } else if (landedSpace.type === 'tax' && landedSpace.amount) {
                    const currentMoney = updates[`players.${currentUserId}.money`] !== undefined ? updates[`players.${currentUserId}.money`] : playerState.money;
                    const taxAmount = Math.round(landedSpace.amount * deductionMultiplier);
                    if (currentMoney >= taxAmount) {
                        updates[`players.${currentUserId}.money`] = currentMoney - taxAmount;
                        updates.bankMoney = (freshGameData.bankMoney || 0) + taxAmount;
                        messages.push(`${playerState.name} paid £${taxAmount} for ${landedSpace.name}.`);
                    } else {
                        updates[`players.${currentUserId}.money`] = currentMoney - taxAmount;
                        updates.bankMoney = (freshGameData.bankMoney || 0) + taxAmount;
                        messages.push(`${playerState.name} incurred £${taxAmount} tax for ${landedSpace.name}.`);
                    }
                } else if (landedSpace.type === 'crime_spree' && landedSpace.amount) {
                    const currentMoney = updates[`players.${currentUserId}.money`] !== undefined ? updates[`players.${currentUserId}.money`] : playerState.money;
                    const fine = Math.round(landedSpace.amount * deductionMultiplier);
                    if (currentMoney >= fine) {
                        updates[`players.${currentUserId}.money`] = currentMoney - fine;
                        updates.bankMoney = (freshGameData.bankMoney || 0) + fine;
                        messages.push(`${playerState.name} landed on Crime Spree and was fined £${fine}!`);
                    } else {
                        updates[`players.${currentUserId}.money`] = 0;
                        updates[`players.${currentUserId}.isBankrupt`] = true;
                        updates.bankMoney = (freshGameData.bankMoney || 0) + currentMoney;
                        messages.push(`${playerState.name} fined £${fine} for Crime Spree and is BANKRUPT!`);
                    }
                } else if (landedSpace.type === 'go_to_detention') {
                    updates[`players.${currentUserId}.position`] = detentionCenterSpaceId;
                    updates[`players.${currentUserId}.inDetention`] = true;
                    updates[`players.${currentUserId}.missedTurnsInDetention`] = 0;
                    updates[`players.${currentUserId}.attemptedDetentionRollThisStay`] = false; // Reset for new detention stay
                    messages.push(`${playerState.name} was sent to Detention!`);
                    isDoubles = false;
                    currentDoublesCount = 0;
                    updates[`players.${currentUserId}.doublesRolledInTurn`] = 0;
                    updates[`players.${currentUserId}.playerActionTakenThisTurn`] = true; // Action taken by going to jail
                    wasSentToDetentionThisRoll = true; // Player sent to detention
                    updates.detentionTransactionId = Date.now(); // Add marker for detention transaction
                }

                const propertyDataEntry = freshGameData.propertyData.find(p => p.id === landedSpace.id);
                if ((landedSpace.type === 'property' || landedSpace.type === 'set_property') &&
                    propertyDataEntry && propertyDataEntry.owner !== null && propertyDataEntry.owner !== currentUserId &&
                    !freshGameData.players[propertyDataEntry.owner]?.isBankrupt) {

                    rentPaymentRequired = true;
                    rentPayerId = currentUserId;
                    rentPropertyId = landedSpace.id;
                    messages.push(`${playerState.name} landed on ${landedSpace.name}, owned by ${freshGameData.players[propertyDataEntry.owner]?.name || 'another'}. Rent due.`);
                }
                // Always mark action as taken, doubles only affect if you get another roll
                updates[`players.${currentUserId}.playerActionTakenThisTurn`] = true;
            }

            updates.lastDiceRoll = { 
                die1, 
                die2, 
                total: totalRoll, 
                isDoubles, 
                playerId: currentUserId, // Associate roll with the player who made it
                rollId: `${Date.now()}-${crypto.randomUUID()}` // Unique ID for this specific roll
            };
            updates.lastActionMessage = messages.join(" ");
            updates.updatedAt = serverTimestamp();
            transaction.update(gameDocRef, updates);
        });

        if (rentPaymentRequired && rentPayerId && rentPropertyId !== undefined) {
            logEvent(`Post-roll transaction: Rent payment required for property ID ${rentPropertyId} by player ${rentPayerId}.`);
            const gameSnapshot = await getDoc(gameDocRef);
            if (gameSnapshot.exists()) {
                const currentFreshGameData = gameSnapshot.data();
                const payerStateForRent = currentFreshGameData.players[rentPayerId];
                const propertyForRentLayout = currentFreshGameData.boardLayout.find(s => s.id === rentPropertyId);
                const propertyForRentData = currentFreshGameData.propertyData.find(p => p.id === rentPropertyId);

                if (payerStateForRent && propertyForRentLayout && propertyForRentData && propertyForRentData.owner && propertyForRentData.owner !== rentPayerId) {
                    await payRent(payerStateForRent, propertyForRentData, propertyForRentLayout, currentFreshGameData);
                }
            }
        }

        // If player was sent to detention this roll, wait for transaction to complete before ending turn
        if (wasSentToDetentionThisRoll) {
            logEvent(`Player ${currentUserId} was sent to detention. Waiting for transaction to complete before ending turn.`);
            // Add a delay to ensure the transaction has fully propagated
            setTimeout(async () => {
                try {
                    const finalCheck = await getDoc(gameDocRef);
                    if (finalCheck.exists()) {
                        const finalData = finalCheck.data();
                        // Only end turn if the detention transaction was successful
                        if (finalData.detentionTransactionId) {
                            logEvent(`Detention transaction confirmed. Ending turn for player ${currentUserId}.`);
                            await handleEndTurnAction();
                        }
                    }
                } catch (e) {
                    logEvent(`Error in detention turn end handling: ${e.message}`);
                }
            }, 1000);
            return; // Skip card draw and other post-roll processing
        }

    } catch (error) {
        console.error("Error during roll dice action transaction:", error);
        showMessageModal("Roll Error", "Could not process roll transaction: " + error.message);
        if(rollDiceButton) rollDiceButton.disabled = false;
        return;
    }

    setTimeout(async () => {
        const gameDataForCard = localGameData; 
        if (!gameDataForCard || !gameDataForCard.players || !gameDataForCard.players[currentUserId] || landedSpaceIdAfterMove === undefined) return;

        const playerForCard = gameDataForCard.players[currentUserId];
        if (playerForCard.isBankrupt || playerForCard.inDetention) return; 

        const finalLandedSpace = gameDataForCard.boardLayout[landedSpaceIdAfterMove];
        if (!finalLandedSpace) return;

        const justWentToJailThisMove = localGameData.players[currentUserId]?.inDetention && landedSpaceIdAfterMove === detentionCenterSpaceId;

        if (!justWentToJailThisMove && !rentPaymentRequired) { 
            if (finalLandedSpace.type === 'opportunity') {
                await drawAndShowOpportunityCard(currentUserId);
            } else if (finalLandedSpace.type === 'welfare') {
                await drawAndShowWelfareCard(currentUserId);
            }
        } else {
            logEvent("Card draw skipped due to rent payment or going to jail this move.");
        }
    }, rentPaymentRequired ? 400 : 200);
}

async function handleEndTurnAction() {
    logEvent("End turn action initiated by " + currentUserId);
    if (autoRollDiceTimeout) { // Clear timeout if turn ended manually or by AI
        clearTimeout(autoRollDiceTimeout);
        autoRollDiceTimeout = null;
        logEvent("Turn ended, cleared auto-roll dice timeout.");
    }

    if (!currentGameId || !localGameData || !currentUserId || !db) {
        logEvent("EndTurn: Exiting - Missing critical global vars.");
        showMessageModal("Error", "Game data or connection issue.");
        return;
    }

    const gameDataForCheck = localGameData;
    const currentPlayerIdFromState = gameDataForCheck.playerOrder[gameDataForCheck.currentPlayerIndex];

    const isHostEndingAIsTurn = gameDataForCheck.players[currentPlayerIdFromState]?.isAI && currentUserId === gameDataForCheck.hostId;
    const isPlayerEndingOwnTurn = currentPlayerIdFromState === currentUserId && !gameDataForCheck.players[currentUserId]?.isAI;

    if (!isHostEndingAIsTurn && !isPlayerEndingOwnTurn) {
        logEvent(`EndTurn: ERROR - Turn mismatch or invalid caller. Current turn player: ${currentPlayerIdFromState}, Caller: ${currentUserId}. Is host ending AI's turn? ${isHostEndingAIsTurn}. Is player ending own turn? ${isPlayerEndingOwnTurn}`);
        showMessageModal("Error", "It's not your turn to end, or invalid action.");
        return;
    }

    const playerEndingTurnId = currentPlayerIdFromState;
    const playerState = gameDataForCheck.players[playerEndingTurnId];
    if (!playerState) {
        logEvent(`EndTurn: Exiting - Player state not found for player ${playerEndingTurnId}.`);
        showMessageModal("Error", "Cannot end turn (player state error).");
        return;
    }

    // If player is bankrupt, skip straight to advancing the turn
    if (playerState.isBankrupt) {
        logEvent(`EndTurn: Player ${playerEndingTurnId} is bankrupt - advancing turn automatically.`);
        // Inform the local human player if they are the one ending their turn
        if (isPlayerEndingOwnTurn) {
            showMessageModal("Bankrupt", "You are bankrupt and your turn will be skipped.");
        }
    }

    // Instead of preventing turn end, automatically roll dice if needed
    if (!playerState.playerActionTakenThisTurn && !playerState.inDetention && !playerState.isBankrupt) {
        logEvent(`EndTurn: Player ${playerEndingTurnId} has not taken action - Auto-rolling dice`);
        handleRollDiceAction();
        return;
    }

    if (playerState.isBankrupt) {
        logEvent(`EndTurn: Exiting - Player ${playerEndingTurnId} is bankrupt, turn should have been skipped.`);
    } else {
        if (gameDataForCheck.lastDiceRoll?.isDoubles &&
            (playerState.doublesRolledInTurn || 0) > 0 &&
            (playerState.doublesRolledInTurn || 0) < 3 &&
            !playerState.inDetention &&
            !playerState.playerActionTakenThisTurn) {
            logEvent(`EndTurn: Player ${playerEndingTurnId} rolled doubles - Auto-rolling again`);
            handleRollDiceAction();
            return;
        }
                    if (!playerState.playerActionTakenThisTurn && !playerState.inDetention) {
                logEvent(`EndTurn: Exiting for ${playerEndingTurnId} - Player has not taken their main action. playerActionTakenThisTurn is false.`);
                return;
            }
    }

    logEvent(`EndTurn: Player ${playerEndingTurnId} is proceeding to end turn transaction.`);
    if(endTurnButton && isPlayerEndingOwnTurn) endTurnButton.disabled = true;

    const gameDocRef = doc(db, "games", currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) throw new Error("Game not found for end turn.");
            const freshGameData = freshGameDoc.data();

            const freshCurrentPlayerId = freshGameData.playerOrder[freshGameData.currentPlayerIndex];
            if (freshCurrentPlayerId !== playerEndingTurnId) {
                logEvent(`EndTurn TXN: Turn already changed. Expected to end for ${playerEndingTurnId}, but current is ${freshCurrentPlayerId}. Aborting.`);
                return;
            }
            const freshPlayerState = freshGameData.players[playerEndingTurnId];
            if (!freshPlayerState) {
                logEvent(`EndTurn TXN: Player ${playerEndingTurnId} missing. Aborting.`);
                return;
            }

            if (!freshPlayerState.isBankrupt) {
                if (freshGameData.lastDiceRoll?.isDoubles &&
                    (freshPlayerState.doublesRolledInTurn || 0) > 0 &&
                    (freshPlayerState.doublesRolledInTurn || 0) < 3 &&
                    !freshPlayerState.inDetention &&
                    !freshPlayerState.playerActionTakenThisTurn) {
                    logEvent(`EndTurn TXN for ${playerEndingTurnId}: Must roll again (doubles) based on fresh data. Aborting.`);
                    return;
                }
                if (!freshPlayerState.playerActionTakenThisTurn && !freshPlayerState.inDetention) {
                    logEvent(`EndTurn TXN for ${playerEndingTurnId}: Player action not taken in fresh data. Aborting. playerActionTakenThisTurn is false.`);
                    return;
                }
            }


            let updates = {};
            updates[`players.${playerEndingTurnId}.playerActionTakenThisTurn`] = false;
            updates[`players.${playerEndingTurnId}.doublesRolledInTurn`] = 0;

            let nextPlayerIndex = (freshGameData.currentPlayerIndex + 1) % freshGameData.playerOrder.length;
            let nextPlayerId = freshGameData.playerOrder[nextPlayerIndex];
            let attempts = 0;
            const maxAttempts = freshGameData.playerOrder.length;

            // Skip bankrupt players in turn order
            while (freshGameData.players[nextPlayerId]?.isBankrupt && attempts < maxAttempts) {
                logEvent(`EndTurn TXN: Skipping bankrupt player ${freshGameData.players[nextPlayerId]?.name}.`);
                nextPlayerIndex = (nextPlayerIndex + 1) % freshGameData.playerOrder.length;
                nextPlayerId = freshGameData.playerOrder[nextPlayerIndex];
                attempts++;
            }

            const nonBankruptPlayers = freshGameData.playerOrder.filter(pid => !freshGameData.players[pid]?.isBankrupt);

            if (freshGameData.doublesMode) {
                const survivingTeams = Array.from(new Set(nonBankruptPlayers.map(pid => freshGameData.players[pid].teamId)));
                if (survivingTeams.length === 1 && survivingTeams[0] !== null && survivingTeams[0] !== undefined) {
                    updates.status = "finished";
                    const winners = nonBankruptPlayers.map(pid => freshGameData.players[pid].name).join(" & ");
                    updates.lastActionMessage = `Game Over! Team ${survivingTeams[0] + 1} (${winners}) wins!`;
                    logEvent(`Game ended. Team ${survivingTeams[0]} wins. Survivors: ${winners}`);
                }
            }

            if (freshGameData.status !== "finished" && freshGameData.playerOrder.length >= 2 && nonBankruptPlayers.length === 1) {
                updates.status = "finished";
                const winnerName = freshGameData.players[nonBankruptPlayers[0]].name;
                updates.lastActionMessage = `Game Over! ${winnerName} is the winner!`;
                logEvent(`Game ended. Winner: ${winnerName}. Non-bankrupt players: ${JSON.stringify(nonBankruptPlayers.map(pid => freshGameData.players[pid]))}`);
            } else if (nonBankruptPlayers.length === 0 && freshGameData.playerOrder.length >= 1) {
                updates.status = "finished";
                updates.lastActionMessage = "All players are bankrupt! Game Over!";
                logEvent("Game ended. All players bankrupt.");
            } else if (attempts >= maxAttempts && nonBankruptPlayers.length > 1) {
                logEvent("Error in turn progression: Loop completed but non-bankrupt players should exist.");
                updates.status = "finished";
                updates.lastActionMessage = "Error finding next player. Game Over.";
            } else {
                updates.currentPlayerIndex = nextPlayerIndex;
                updates.lastActionMessage = `${freshPlayerState.name} ${freshPlayerState.isAI ? "(AI)" : ""} ended their turn. It's now ${freshGameData.players[nextPlayerId].name}${freshGameData.players[nextPlayerId].isAI ? " (AI)" : ""}'s turn.`;
                updates.lastDiceRoll = null;
            }

            updates.updatedAt = serverTimestamp();
            transaction.update(gameDocRef, updates);
            logEvent(`EndTurn TXN: ${freshPlayerState.name} ended turn. Next is ${nextPlayerId || 'N/A'}.`);
        });
    } catch (error) {
        console.error("Error ending turn (transaction phase):", error);
        showMessageModal("End Turn Error", "Could not end turn: " + error.message);
    }
}

async function handleBuyPropertyAction() {
    if (autoRollDiceTimeout) {
        clearTimeout(autoRollDiceTimeout);
        autoRollDiceTimeout = null;
        logEvent("Attempting to buy property, cleared auto-roll dice timeout.");
    }
    logEvent("BuyProp: Action initiated by user: " + currentUserId);

    if (!currentGameId || !localGameData || !currentUserId || !db) {
        logEvent("BuyProp: Exiting - Missing critical global vars.");
        showMessageModal("Error", "Game data or connection issue.");
                return;
            }
    if (localGameData.players[currentUserId]?.isAI) {
        logEvent("BuyProp: AI cannot use this button."); return;
    }

    const currentSnapshotGameData = localGameData;
    const currentPlayerIdFromOrder = currentSnapshotGameData.playerOrder[currentSnapshotGameData.currentPlayerIndex];
    logEvent("BuyProp: Current turn player from order: " + currentPlayerIdFromOrder + ", current user: " + currentUserId);

    if (currentPlayerIdFromOrder !== currentUserId) {
        logEvent(`BuyProp: Exiting - Not current player's turn. Expected: ${currentPlayerIdFromOrder}`);
        showMessageModal("Error", "Not your turn to buy property.");
        return;
    }
        
    const playerState = currentSnapshotGameData.players[currentUserId];
    if (!playerState) {
        logEvent("BuyProp: Exiting - Player state not found for user: " + currentUserId);
        showMessageModal("Error", "Player data not found.");
        return;
    }
    if (playerState.isBankrupt) {
        logEvent(`BuyProp: Exiting - Player ${currentUserId} is bankrupt.`);
        showMessageModal("Error", "Cannot buy property (player is bankrupt).");
        return;
    }

    logEvent("BuyProp: Player state check passed.");

                if (!currentSnapshotGameData.lastDiceRoll && !playerState.playerActionTakenThisTurn) {
                 logEvent("BuyProp: Exiting - Player has not rolled/landed yet in this turn segment."); 
                 return;
            }

    const currentPosition = playerState.position;
    const spaceDetails = currentSnapshotGameData.boardLayout[currentPosition];
    logEvent("BuyProp: Attempting to buy space:", { position: currentPosition, spaceDetails });

    const propertyDataEntry = Array.isArray(currentSnapshotGameData.propertyData) ?
        currentSnapshotGameData.propertyData.find(p => p.id === currentPosition) : null;

    if (!spaceDetails || !propertyDataEntry || (spaceDetails.type !== 'property' && spaceDetails.type !== 'set_property')) {
        logEvent(`BuyProp: Exiting - Not a buyable property.`);
        showMessageModal("Invalid Space", "Not a buyable property space.");
        return;
    }

    if (propertyDataEntry.owner && (!currentSnapshotGameData.players[propertyDataEntry.owner]?.isBankrupt)) {
        logEvent(`BuyProp: Exiting - Property already owned by active player ${propertyDataEntry.owner}`);
        showMessageModal("Owned", `This property (${spaceDetails.name}) is already owned by ${currentSnapshotGameData.players[propertyDataEntry.owner]?.name || 'another player'}.`);
        return;
    }

    let price = spaceDetails.price;
    let usedVoucher = false;
    if (playerState.hasHousingVoucher && spaceDetails.type === 'property') {
        price = Math.round(price * 0.75);
        usedVoucher = true;
        logEvent("BuyProp: Housing voucher applied. New price: " + price);
    }

    if (playerState.money < price) {
        logEvent(`BuyProp: Exiting - Insufficient funds. Needs: ${price}, Has: ${playerState.money}`);
        showMessageModal("Insufficient Funds", `You need £${price} to buy ${spaceDetails.name}, but you only have £${playerState.money}.`);
        return;
    }

    logEvent("BuyProp: All pre-transaction checks passed. Disabling button and starting transaction.");
    if(buyPropertyButton) buyPropertyButton.disabled = true;

    const gameDocRef = doc(db, "games", currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            logEvent("BuyProp TXN: Inside transaction.");
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) {
                logEvent("BuyProp TXN: Game doc not found.");
                throw new Error("Game not found for buying property.");
            }
            const freshGameData = freshGameDoc.data();
            logEvent("BuyProp TXN: Fetched fresh game data.");

            if (freshGameData.playerOrder[freshGameData.currentPlayerIndex] !== currentUserId) {
                logEvent("BuyProp TXN: Not player's turn in fresh data.");
                throw new Error("Not your turn (checked in transaction).");
            }
            const freshPlayerState = freshGameData.players[currentUserId];
            if (!freshPlayerState || freshPlayerState.isBankrupt) {
                logEvent("BuyProp TXN: Player state error/bankrupt in fresh data.");
                throw new Error("Player error in transaction.");
            }

            if (!freshGameData.lastDiceRoll && !freshPlayerState.playerActionTakenThisTurn) {
                logEvent("BuyProp TXN: Player has not rolled/landed (fresh data).");
                throw new Error("Player action not completed (checked in transaction).");
            }

            const freshCurrentPosition = freshPlayerState.position;
            const actualSpaceDetails = freshGameData.boardLayout[freshCurrentPosition];
            logEvent("BuyProp TXN: Fresh player position: " + freshCurrentPosition);

            if (!Array.isArray(freshGameData.propertyData)) {
                logEvent("BuyProp TXN: propertyData is not an array in fresh data.");
                throw new Error("Property data in Firestore is not an array. Cannot buy.");
            }
            const freshPropertyDataEntry = freshGameData.propertyData.find(p => p.id === freshCurrentPosition);

            if (!actualSpaceDetails || !freshPropertyDataEntry || (actualSpaceDetails.type !== 'property' && actualSpaceDetails.type !== 'set_property')) {
                logEvent("BuyProp TXN: Not a buyable space in fresh data.");
                throw new Error("Not a buyable property space (checked in transaction).");
            }
            if (freshPropertyDataEntry.owner && (!freshGameData.players[freshPropertyDataEntry.owner]?.isBankrupt)) {
                logEvent("BuyProp TXN: Property already owned by active player in fresh data: " + freshPropertyDataEntry.owner);
                throw new Error(`Property (${actualSpaceDetails.name}) already owned by ${freshGameData.players[freshPropertyDataEntry.owner]?.name || 'another player'} (checked in transaction).`);
            }
            // If owned by bankrupt player, it's available for purchase but keep development level
            const keepDevelopmentLevel = freshPropertyDataEntry.owner && freshGameData.players[freshPropertyDataEntry.owner]?.isBankrupt;

            let actualPrice = actualSpaceDetails.price;
            let actualUsedVoucher = false;
            if (freshPlayerState.hasHousingVoucher && actualSpaceDetails.type === 'property') {
                actualPrice = Math.round(actualPrice * 0.75);
                actualUsedVoucher = true;
            }
            if (freshPlayerState.money < actualPrice) {
                logEvent("BuyProp TXN: Insufficient funds in fresh data.");
                throw new Error(`Insufficient funds (£${freshPlayerState.money} vs £${actualPrice}) for ${actualSpaceDetails.name} (checked in transaction).`);
            }

            let updates = {};
            updates[`players.${currentUserId}.money`] = freshPlayerState.money - actualPrice;
            let updatedPropertyData = freshGameData.propertyData.map(prop => {
                if (prop.id === freshCurrentPosition) {
                    if (keepDevelopmentLevel) {
                        // Keep tenancies and PR status when buying from bankrupt player
                        return { ...prop, owner: currentUserId };
                    } else {
                        // New purchase, reset development
                        return { ...prop, owner: currentUserId, tenancies: 0, permanentResidence: false };
                    }
                }
                return prop;
            });

            let transferOwnerId = null;
            let captureInfo = null; // {propId, fromOwner}
            if (AUTO_TRANSFER_GROUPS.includes(actualSpaceDetails.groupId)) {
                logEvent(`BuyProp TXN: Checking property set logic for ${actualSpaceDetails.name} (${actualSpaceDetails.groupId})`);
                
                // Group properties by their groupId (color sets)
                const groupPropIds = freshGameData.boardLayout
                    .filter(s => s.groupId === actualSpaceDetails.groupId && s.type === 'property')
                    .map(s => s.id);
                logEvent(`BuyProp TXN: Group properties: ${JSON.stringify(groupPropIds)}`);

                // Log current ownership state with property names for clarity
                const ownershipState = groupPropIds.map(id => {
                    const prop = updatedPropertyData.find(p => p.id === id);
                    const owner = prop?.owner;
                    const ownerName = owner ? freshGameData.players[owner]?.name : 'None';
                    const propName = freshGameData.boardLayout.find(s => s.id === id)?.name;
                    return `${propName}: Owner=${ownerName}`;
                });
                logEvent(`BuyProp TXN: Current ownership: ${JSON.stringify(ownershipState)}`);

                const ownerMap = {};
                groupPropIds.forEach(id => {
                    const prop = updatedPropertyData.find(p => p.id === id);
                    if (prop && prop.owner && prop.owner !== currentUserId) {
                        ownerMap[id] = prop.owner;
                        const ownerName = freshGameData.players[prop.owner]?.name;
                        const propName = freshGameData.boardLayout.find(s => s.id === id)?.name;
                        logEvent(`BuyProp TXN: Found other owner ${ownerName} for property ${propName}`);
                    }
                });

                const ownerCounts = {};
                Object.values(ownerMap).forEach(oid => {
                    ownerCounts[oid] = (ownerCounts[oid] || 0) + 1;
                });
                logEvent(`BuyProp TXN: Owner counts: ${JSON.stringify(ownerCounts)}`);

                // First check if any other player owns 2 properties
                for (const [oid, count] of Object.entries(ownerCounts)) {
                    if (count === 2) {
                        transferOwnerId = oid; // another player already had 2
                        logEvent(`BuyProp TXN: Found potential transfer owner ${freshGameData.players[oid]?.name} with 2 properties`);
                        break;
                    }
                }

                // If buying from a bankrupt player, the property should NOT auto-transfer to a third party.
                // It should stay with the current buyer (currentUserId).
                if (keepDevelopmentLevel && transferOwnerId) {
                    logEvent(`BuyProp TXN: Buying from bankrupt. Preventing auto-transfer of ${actualSpaceDetails.name} to ${freshGameData.players[transferOwnerId]?.name}. Property stays with ${freshGameData.players[currentUserId]?.name}.`);
                    transferOwnerId = null; // Nullify to prevent the transfer to a third party
                }

                // If no transfer, check if current player can capture
                // (Capture logic might still apply if transfer was prevented or not applicable)
                if (!transferOwnerId) { // This check is still valid, as transferOwnerId might be null from above
                    logEvent(`BuyProp TXN: No transfer owner found/applicable, checking for capture by current player.`);
                    const currentPlayerProps = groupPropIds.filter(pid => {
                        const prop = updatedPropertyData.find(p => p.id === pid);
                        return prop && prop.owner === currentUserId;
                    });
                    logEvent(`BuyProp TXN: Current player owns ${currentPlayerProps.length} properties in group`);

                    if (currentPlayerProps.length === 2) {
                        const remainingPropId = groupPropIds.find(pid => {
                            const prop = updatedPropertyData.find(p => p.id === pid);
                            return prop && prop.owner && prop.owner !== currentUserId;
                        });
                        if (remainingPropId) {
                            const remainingProp = updatedPropertyData.find(p => p.id === remainingPropId);
                            captureInfo = { propId: remainingPropId, fromOwner: remainingProp.owner };
                            logEvent(`BuyProp TXN: Can capture property ${remainingPropId} from ${freshGameData.players[remainingProp.owner]?.name}`);
                        }
                    }
                }

                if (transferOwnerId) {
                    logEvent(`BuyProp TXN: Executing transfer to ${freshGameData.players[transferOwnerId]?.name}`);
                    updatedPropertyData = updatedPropertyData.map(p => {
                        if (p.id === freshCurrentPosition) return { ...p, owner: transferOwnerId };
                        return p;
                    });
                } else if (captureInfo) {
                    logEvent(`BuyProp TXN: Executing capture of property ${captureInfo.propId}`);
                    updatedPropertyData = updatedPropertyData.map(p => {
                        if (p.id === captureInfo.propId) return { ...p, owner: currentUserId };
                        return p;
                    });
                } else {
                    logEvent(`BuyProp TXN: No transfer or capture needed`);
                }
            }

            updates.propertyData = updatedPropertyData;
            updates.bankMoney = (freshGameData.bankMoney || 0) + actualPrice;

            if (transferOwnerId) {
                updates[`players.${currentUserId}.propertiesOwned`] = freshPlayerState.propertiesOwned;
                const transferState = freshGameData.players[transferOwnerId];
                updates[`players.${transferOwnerId}.propertiesOwned`] = [
                    ...(transferState.propertiesOwned || []),
                    freshCurrentPosition
                ];
                updates.lastActionMessage = `${freshPlayerState.name} bought ${actualSpaceDetails.name} for £${actualPrice}${actualUsedVoucher ? ' (with voucher)' : ''}, but it automatically transferred to ${transferState.name}.`;
            } else if (captureInfo) {
                const fromState = freshGameData.players[captureInfo.fromOwner];
                const newCurrentProps = [
                    ...(freshPlayerState.propertiesOwned || []),
                    freshCurrentPosition,
                    captureInfo.propId
                ];
                updates[`players.${currentUserId}.propertiesOwned`] = newCurrentProps;
                updates[`players.${captureInfo.fromOwner}.propertiesOwned`] = (fromState.propertiesOwned || []).filter(pid => pid !== captureInfo.propId);
                if (actualUsedVoucher) {
                    updates[`players.${currentUserId}.hasHousingVoucher`] = false;
                }
                const takenPropName = freshGameData.boardLayout[captureInfo.propId]?.name || 'a property';
                updates.lastActionMessage = `${freshPlayerState.name} bought ${actualSpaceDetails.name} for £${actualPrice}${actualUsedVoucher ? ' (with voucher)' : ''} and took ${takenPropName} from ${fromState.name}.`;
                } else {
                updates[`players.${currentUserId}.propertiesOwned`] = arrayUnion(freshCurrentPosition);
                if (actualUsedVoucher) {
                    updates[`players.${currentUserId}.hasHousingVoucher`] = false;
                }
                updates.lastActionMessage = `${freshPlayerState.name} bought ${actualSpaceDetails.name} for £${actualPrice}${actualUsedVoucher ? ' (with voucher)' : ''}.`;
            }
            updates.updatedAt = serverTimestamp();

            if (!freshGameData.lastDiceRoll?.isDoubles) {
                updates[`players.${currentUserId}.playerActionTakenThisTurn`] = true;
                logEvent("BuyProp TXN: Non-doubles roll, setting playerActionTakenThisTurn to true.");
            } else {
                updates[`players.${currentUserId}.playerActionTakenThisTurn`] = false;
                logEvent("BuyProp TXN: Doubles roll, playerActionTakenThisTurn explicitly set to false to ensure re-roll.");
            }

            // Check if player completed a set of 3
            const groupProperties = freshGameData.boardLayout.filter(s => s.groupId === actualSpaceDetails.groupId && s.type === 'property');
            const ownedInGroup = groupProperties.filter(space => {
                const propData = updatedPropertyData.find(p => p.id === space.id);
                return propData && propData.owner === currentUserId;
            });
            
            // If player owns all 3 properties in the group, play set sound
            if (ownedInGroup.length === 3) {
                playSetSound();
            }

            // Play crack house sound if the purchased property is a crack house
            if (actualSpaceDetails.name === "Crack House") {
                playCrackHouseSound();
            }

            transaction.update(gameDocRef, updates);
            logEvent("BuyProp TXN: Transaction update successful.");

            if (audioContextStarted && toneSynth) {
                try {
                    toneSynth.triggerAttackRelease("A3", "16n", Tone.now());
                    toneSynth.triggerAttackRelease("F#3", "16n", Tone.now() + 0.07);
                } catch(e){ console.error("Buy property sound error:", e); }
            }
        });
        logEvent("BuyProp: Transaction completed successfully.");
    } catch (error) {
        console.error("Error buying property (transaction phase):", error);
        showMessageModal("Buy Property Error", "Could not buy property: " + error.message);
    } finally {
        logEvent("BuyProp: Action finished.");
    }
}

async function handlePreGameRollAction(playerIdToRoll = currentUserId) {
    logEvent(`PreGameRoll action initiated. Player to roll: ${playerIdToRoll}, Current user: ${currentUserId}`);
    if (autoRollDiceTimeout) {
        clearTimeout(autoRollDiceTimeout);
        autoRollDiceTimeout = null;
        logEvent("Pre-game roll action, cleared auto-roll dice timeout.");
    }
    // Disable the button immediately to prevent multiple clicks
    if (!currentGameId || !localGameData || !localGameData.preGamePhase) {
        // Check if it's an AI vs AI game
        const playerToRollData = localGameData?.players?.[playerIdToRoll];
        const isAIVsAIGame = playerToRollData?.isAI;
        
        // Only show the message if it's not an AI vs AI game
        if (!isAIVsAIGame) {
            showMessageModal("Error", "Not in pre-game roll phase.");
        }
        return false;
    }
    const playerToRollData = localGameData.players[playerIdToRoll];
    if (!playerToRollData) {
        showMessageModal("Error", "Player data not found for roll.");
        return false;
    }

    if (Object.values(localGameData.players).filter(p => !p.isAI).length < localGameData.numHumanPlayers) {
        if (!playerToRollData.isAI) showMessageModal("Waiting", "Waiting for all human players to join before rolling.");
        return false;
    }
    if (localGameData.playerOrder.length < localGameData.maxPlayers) {
        if (!playerToRollData.isAI) showMessageModal("Waiting", "Waiting for game to fully initialize with all players.");
        return false;
    }

    if (localGameData.preGameRolls && localGameData.preGameRolls[playerIdToRoll] !== undefined) {
        if (!playerToRollData.isAI) showMessageModal("Already Rolled", "You have already rolled for starting position.");
        return false;
    }

    let nextToRollInPreGame = null;
    const sortedByJoinOrderForPreGame = [...localGameData.playerOrder].sort((a,b) => (localGameData.players[a]?.order || 0) - (localGameData.players[b]?.order || 0));
    for (const pid of sortedByJoinOrderForPreGame) {
        if (!localGameData.preGameRolls || localGameData.preGameRolls[pid] === undefined) {
            nextToRollInPreGame = pid;
            break;
        }
    }
    if (nextToRollInPreGame !== playerIdToRoll) {
        if (!playerToRollData.isAI) showMessageModal("Wait", "It's not your turn to roll for starting position.");
        return false;
    }


    if(preGameRollButton && !playerToRollData.isAI) preGameRollButton.disabled = true;
    const roll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;

    const gameDocRef = doc(db, "games", currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) throw new Error("Game not found for pre-game roll.");
            const freshGameData = freshGameDoc.data();
            if (!freshGameData.players || !freshGameData.players[playerIdToRoll]) throw new Error("Player data missing in Firestore for pre-game roll.");
            if (!freshGameData.preGamePhase) throw new Error("Pre-game phase ended.");
            if (freshGameData.preGameRolls && freshGameData.preGameRolls[playerIdToRoll] !== undefined) {
                throw new Error("Already rolled (checked in transaction).");
            }

            let updates = {};
            updates[`preGameRolls.${playerIdToRoll}`] = roll;
            updates.lastActionMessage = `${freshGameData.players[playerIdToRoll].name} ${freshGameData.players[playerIdToRoll].isAI ? "(AI)" : ""} rolled ${roll} for starting order.`;
            updates.updatedAt = serverTimestamp();

            const currentPreGameRollsWithThis = { ...(freshGameData.preGameRolls || {}), [playerIdToRoll]: roll };
            const allPlayersInOrder = freshGameData.playerOrder || [];
            const allHaveRolled = allPlayersInOrder.length > 0 &&
                allPlayersInOrder.length === freshGameData.maxPlayers &&
                allPlayersInOrder.every(pid => currentPreGameRollsWithThis[pid] !== undefined);


            if (allHaveRolled) {
                updates.lastActionMessage += " All players rolled.";
                if (freshGameData.hostId === currentUserId || playerToRollData.isAI) {
                    logEvent("All pre-game rolls complete. Host will finalize order.");
                }
            }
            transaction.update(gameDocRef, updates);
        });
        return true;
    } catch (error) {
        console.error("Error during pre-game roll:", error);
        if (!playerToRollData.isAI) {
            showMessageModal("Roll Error", "Could not process pre-game roll: " + error.message);
            if(preGameRollButton) preGameRollButton.disabled = false;
        }
        return false;
    }
}

async function automateAIPreGameRolls(gameData) {
    if (currentUserId !== gameData.hostId || !gameData.preGamePhase) return;

    for (const playerId of gameData.playerOrder) {
        const player = gameData.players[playerId];
        if (player.isAI && (gameData.preGameRolls === undefined || gameData.preGameRolls[playerId] === undefined)) {
            logEvent(`Host automating pre-game roll for AI: ${player.name}`);
            await handlePreGameRollAction(playerId);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
}


// --- Event Listeners ---
createGameButton.onclick = handleCreateGame;
joinGameButton.onclick = handleJoinGame;
rollDiceButton.onclick = handleRollDiceAction;
preGameRollButton.onclick = () => handlePreGameRollAction();
endTurnButton.onclick = handleEndTurnAction;
buyPropertyButton.onclick = handleBuyPropertyAction;
developPropertyButton.onclick = () => {
    if (localGameData && currentUserId && localGameData.players && localGameData.players[currentUserId] && !localGameData.players[currentUserId].isAI) {
        showDevelopPropertyOptions(localGameData.players[currentUserId], localGameData);
    }
};
closeDevelopButton.onclick = () => {
    if(developPropertyContainer) developPropertyContainer.style.display = 'none';
};

generatedGameIdSpan.onclick = () => {
    if (generatedGameIdSpan.textContent) {
        const textArea = document.createElement("textarea");
        textArea.value = generatedGameIdSpan.textContent;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showMessageModal("Copied!", "Game ID copied to clipboard.");
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            showMessageModal("Copy Failed", "Could not copy Game ID automatically. Please select and copy manually.");
        }
        document.body.removeChild(textArea);
    }
};

function shuffleDeck(deck) {
    let newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
}

function canPlayerDevelopAnyProperty(playerState, gameData) {
    if (!playerState || playerState.isBankrupt || !gameData || !Array.isArray(gameData.propertyData) || !gameData.boardLayout) return false;

    return playerState.propertiesOwned.some(propId => {
        const propDetails = gameData.propertyData.find(p => p.id === propId);
        const propLayout = gameData.boardLayout.find(s => s.id === propId);

        if (!propDetails || !propLayout || propLayout.type !== 'property') return false;
        if (propDetails.owner !== playerState.id || propDetails.permanentResidence) return false;

        const groupPropertiesLayout = gameData.boardLayout.filter(s => s.groupId === propLayout.groupId && s.type === 'property');
        const ownsAllInGroup = groupPropertiesLayout.every(gpLayout => {
            const gpDataForCheck = gameData.propertyData.find(pd => pd.id === gpLayout.id);
            return gpDataForCheck && gpDataForCheck.owner === playerState.id;
        });
        if (!ownsAllInGroup) return false;

        if (PR_IS_FIFTH_DEVELOPMENT) {
            return propDetails.tenancies < MAX_TENANCIES_BEFORE_PR || (propDetails.tenancies === MAX_TENANCIES_BEFORE_PR && !propDetails.permanentResidence);
        } else {
            return (propDetails.tenancies < MAX_TENANCIES_BEFORE_PR) || (!propDetails.permanentResidence);
        }
    });
}

function setupDetentionActionsUI(playerState, gameData) {
    // Clear any pending auto-roll dice timeout if detention UI is shown
    if (autoRollDiceTimeout) {
        clearTimeout(autoRollDiceTimeout);
        autoRollDiceTimeout = null;
        logEvent("Opening detention actions, cleared auto-roll dice timeout.");
    }

    const playerId = playerState.id;
    if (!playerState || !playerState.inDetention || !detentionActionsDiv || playerState.isAI) return;
    detentionActionsDiv.innerHTML = '';

    const canTakeAction = gameData.playerOrder[gameData.currentPlayerIndex] === currentUserId && !playerState.playerActionTakenThisTurn;

    if (playerState.getOutOfDetentionCards > 0) {
        const useCardBtn = document.createElement('button');
        useCardBtn.innerHTML = '<i class="fas fa-gavel"></i> Use Legal Aid Card';
        useCardBtn.disabled = !canTakeAction;
        useCardBtn.onclick = async () => {
            const gameDocRef = doc(db, "games", currentGameId);
            try {
                await updateDoc(gameDocRef, {
                    [`players.${currentUserId}.getOutOfDetentionCards`]: playerState.getOutOfDetentionCards - 1,
                    [`players.${currentUserId}.inDetention`]: false,
                    [`players.${currentUserId}.missedTurnsInDetention`]: 0,
                    [`players.${currentUserId}.playerActionTakenThisTurn`]: false,
                    [`players.${currentUserId}.attemptedDetentionRollThisStay`]: false, // Reset flag
                    lastActionMessage: `${playerState.name} used a Legal Aid card and is free. Roll to move.`,
                    updatedAt: serverTimestamp()
                });
            } catch (e) { showMessageModal("Error", "Failed to use card: " + e.message); }
        };
        detentionActionsDiv.appendChild(useCardBtn);
    }

    const fineAmount = Math.round(50 * deductionMultiplier);
    if (playerState.money >= fineAmount) {
                                        const payFineBtn = document.createElement('button');
                payFineBtn.innerHTML = `<i class="fas fa-money-bill-wave"></i> £${fineAmount}`;
                payFineBtn.style.backgroundColor = '#1a237e';
                payFineBtn.style.color = 'white';
                payFineBtn.style.display = 'inline-flex';
                payFineBtn.style.alignItems = 'center';
                payFineBtn.style.justifyContent = 'center';
                payFineBtn.style.gap = '6px';
                payFineBtn.style.padding = '8px 16px';
                payFineBtn.style.width = '100%';
                payFineBtn.disabled = !canTakeAction;
        payFineBtn.onclick = async () => {
            const gameDocRef = doc(db, "games", currentGameId);
            try {
                await updateDoc(gameDocRef, {
                    [`players.${currentUserId}.money`]: playerState.money - fineAmount,
                    [`players.${currentUserId}.inDetention`]: false,
                    [`players.${currentUserId}.missedTurnsInDetention`]: 0,
                    [`players.${currentUserId}.playerActionTakenThisTurn`]: false,
                    [`players.${currentUserId}.attemptedDetentionRollThisStay`]: false, // Reset flag
                    bankMoney: (gameData.bankMoney || 0) + fineAmount,
                    lastActionMessage: `${playerState.name} paid £${fineAmount} fine and is free. Roll to move.`,
                    updatedAt: serverTimestamp()
                });
            } catch (e) { showMessageModal("Error", "Failed to pay fine: " + e.message); }
        };
        detentionActionsDiv.appendChild(payFineBtn);
    }

    const rollDoublesBtn = document.createElement('button');
    rollDoublesBtn.innerHTML = '<i class="fas fa-dice"></i> Roll <i class="fas fa-question-circle"></i>';
    rollDoublesBtn.style.backgroundColor = '#1a237e';
    rollDoublesBtn.style.color = 'white';
    rollDoublesBtn.style.display = 'inline-flex';
    rollDoublesBtn.style.alignItems = 'center';
    rollDoublesBtn.style.justifyContent = 'center';
    rollDoublesBtn.style.gap = '6px';
    rollDoublesBtn.style.padding = '8px 16px';
    rollDoublesBtn.style.width = '100%';
    rollDoublesBtn.disabled = !canTakeAction || playerState.attemptedDetentionRollThisStay;
    if (playerState.attemptedDetentionRollThisStay) {
        rollDoublesBtn.title = "You have already used your one chance to roll for doubles this detention stay.";
    }

    rollDoublesBtn.onclick = async () => {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const isDoubles = die1 === die2;
        const totalRoll = die1 + die2;

        const gameDocRef = doc(db, "games", currentGameId);
        let updates = { 
            updatedAt: serverTimestamp(), 
            lastDiceRoll: {die1, die2, total: totalRoll, isDoubles: isDoubles, playerId: currentUserId, rollId: `${Date.now()}-detention`},
            [`players.${currentUserId}.attemptedDetentionRollThisStay`]: true // Mark roll as attempted
        };
        
        if (isDoubles) {
            updates[`players.${currentUserId}.inDetention`] = false;
            updates[`players.${currentUserId}.missedTurnsInDetention`] = 0;
            updates[`players.${currentUserId}.playerActionTakenThisTurn`] = false; // Free to roll to move
            updates[`players.${currentUserId}.attemptedDetentionRollThisStay`] = false; // Reset as they are out
            updates.lastActionMessage = `${playerState.name} (AI) rolled doubles (${die1},${die2}) and is out of Detention! Roll again to move.`;
        } else {
            // missedTurnsInDetention is not incremented here, but when they end their turn.
            updates[`players.${currentUserId}.playerActionTakenThisTurn`] = true; // Action for this detention turn is done
            updates.lastActionMessage = `${playerState.name} (AI) failed to roll doubles (${die1},${die2}). Must pay £${fineAmount} or end turn to wait.`;
        }
        try {
            await updateDoc(gameDocRef, updates);
        } catch (e) { showMessageModal("Error", "Failed to roll for doubles in detention: " + e.message); }
    };
    detentionActionsDiv.appendChild(rollDoublesBtn);
}

function showDevelopPropertyOptions(playerState, gameData) {
    // Clear any pending auto-roll dice timeout if development window is shown
    if (autoRollDiceTimeout) {
        clearTimeout(autoRollDiceTimeout);
        autoRollDiceTimeout = null;
        logEvent("Opening development window, cleared auto-roll dice timeout.");
    }

    const developWindow = document.getElementById('develop-property-container');
    if (!developWindow || !developPropertyOptionsDiv || !developPropertyNameH3 || playerState.isAI) return;

    // First check if any properties can be developed
    const canDevelopAny = playerState.propertiesOwned.some(propId => {
        const propData = gameData.propertyData.find(p => p.id === propId);
        const propLayout = gameData.boardLayout.find(s => s.id === propId);
        
        if (!propData || !propLayout || propLayout.type !== 'property') return false;
        
        const groupPropertiesLayout = gameData.boardLayout.filter(s => s.groupId === propLayout.groupId && s.type === 'property');
        const ownsAllInGroup = groupPropertiesLayout.every(gpLayout => {
            const gpDataForCheck = gameData.propertyData.find(pd => pd.id === gpLayout.id);
            return gpDataForCheck && gpDataForCheck.owner === playerState.id;
        });

        return ownsAllInGroup && (
            (!propData.permanentResidence && propData.tenancies < MAX_TENANCIES_BEFORE_PR) ||
            (PR_IS_FIFTH_DEVELOPMENT && !propData.permanentResidence && propData.tenancies === MAX_TENANCIES_BEFORE_PR)
        );
    });

    // If no properties can be developed, hide the container and show a message
    if (!canDevelopAny) {
        developWindow.style.display = 'none';
        showMessageModal("Development Complete", "No more properties eligible for development.");
        return;
    }

    developPropertyOptionsDiv.innerHTML = '';
    developPropertyNameH3.textContent = "Develop Property";

    let canDevelopAnything = false;
    let totalCost = 0;
    let developments = [];

    playerState.propertiesOwned.forEach(propId => {
        // Always use the latest property data
        const propLayout = gameData.boardLayout.find(s => s.id === propId);
        const propData = gameData.propertyData.find(p => p.id === propId);

        if (propLayout && propData && propLayout.type === 'property' && propData.owner === playerState.id) {
            const groupPropertiesLayout = gameData.boardLayout.filter(s => s.groupId === propLayout.groupId && s.type === 'property');
            const ownsAllInGroup = groupPropertiesLayout.every(gpLayout => {
                const gpDataForCheck = gameData.propertyData.find(pd => pd.id === gpLayout.id);
                return gpDataForCheck && gpDataForCheck.owner === playerState.id;
            });

            if (ownsAllInGroup) {
                const houseCost = propLayout.houseCost || 50;
                // Only show Add Tenancy if less than max and no PR
                if (!propData.permanentResidence && propData.tenancies < MAX_TENANCIES_BEFORE_PR) {
                    const addTenancyButton = document.createElement('button');
                    addTenancyButton.textContent = `Add 🏠 to ${propLayout.name} (£${houseCost})`;
                    addTenancyButton.disabled = playerState.money < houseCost;
                    addTenancyButton.onclick = () => handleConfirmDevelopment(propId, 'tenancy', houseCost);
                    developPropertyOptionsDiv.appendChild(addTenancyButton);
                    canDevelopAnything = true;
                    totalCost += houseCost;
                    developments.push({ propertyId: propId, type: 'tenancy', cost: houseCost });
                }
                // Only show Build PR if exactly max tenancies and no PR
                if (PR_IS_FIFTH_DEVELOPMENT && !propData.permanentResidence && propData.tenancies === MAX_TENANCIES_BEFORE_PR) {
                    const buildPRButton = document.createElement('button');
                    buildPRButton.textContent = `Build PR on ${propLayout.name} (£${houseCost})`;
                    buildPRButton.disabled = playerState.money < houseCost;
                    buildPRButton.onclick = () => handleConfirmDevelopment(propId, 'pr', houseCost);
                    developPropertyOptionsDiv.appendChild(buildPRButton);
                    canDevelopAnything = true;
                    totalCost += houseCost;
                    developments.push({ propertyId: propId, type: 'pr', cost: houseCost });
                }
            }
        }
    });

    if (!canDevelopAnything) {
        developPropertyOptionsDiv.innerHTML = '<p>No properties currently eligible for development.</p>';
    } else {
        // Add the "Do It" button
        const doItButton = document.createElement('button');
        doItButton.textContent = `DO IT! (All Developments: £${totalCost})`;
        doItButton.style.backgroundColor = '#e74c3c'; // Red color
        doItButton.style.marginTop = '15px';
        doItButton.onclick = async () => {
            if (confirm(`Are you sure you want to purchase all developments for £${totalCost}? This may bankrupt you!`)) {
                for (const dev of developments) {
                    await handleConfirmDevelopment(dev.propertyId, dev.type, dev.cost);
                }
                developPropertyContainer.style.display = 'none';
            }
        };
        developPropertyOptionsDiv.appendChild(doItButton);
    }
    developPropertyContainer.style.display = 'block';
}

async function handleConfirmDevelopment(propertyId, developmentType, cost) {
    logEvent(`handleConfirmDevelopment called for prop: ${propertyId}, type: ${developmentType}, cost: ${cost}`);
    if (!currentGameId || !localGameData || !currentUserId || !db) {
        showMessageModal("Error", "Game data or connection issue.");
        return;
    }
    if (localGameData.players[currentUserId]?.isAI) {
        logEvent("AI attempted to call handleConfirmDevelopment directly. Skipping."); return;
    }

    const gameDocRef = doc(db, "games", currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) throw new Error("Game not found for development.");

            const freshGameData = freshGameDoc.data();
            const playerState = freshGameData.players[currentUserId];
            const propLayout = freshGameData.boardLayout.find(s => s.id === propertyId);
            const propDataIndex = freshGameData.propertyData.findIndex(p => p.id === propertyId);

            if (propDataIndex === -1 || !propLayout || !playerState) {
                throw new Error("Property or player data not found for development.");
            }
            const propData = freshGameData.propertyData[propDataIndex];

            if (propData.owner !== currentUserId) {
                throw new Error("You do not own this property.");
            }
            if (propLayout.type !== 'property') {
                throw new Error("This type of property cannot be developed.");
            }

            const groupPropertiesLayout = freshGameData.boardLayout.filter(s => s.groupId === propLayout.groupId && s.type === 'property');
            const ownsAllInGroup = groupPropertiesLayout.every(gpLayout => {
                const gpDataForCheck = freshGameData.propertyData.find(pd => pd.id === gpLayout.id);
                return gpDataForCheck && gpDataForCheck.owner === currentUserId;
            });
            if (!ownsAllInGroup) {
                throw new Error(`You must own all properties in the ${propLayout.color || propLayout.groupId} group to develop.`);
            }

            let newTenancies = propData.tenancies;
            let newPR = propData.permanentResidence;
            let developmentMessage = "";

            if (developmentType === 'tenancy') {
                if (propData.permanentResidence) throw new Error("Cannot add tenancies to a property with Permanent Residence.");
                if (propData.tenancies >= MAX_TENANCIES_BEFORE_PR) throw new Error("Maximum tenancies reached before PR.");
                newTenancies++;
                developmentMessage = `added a tenancy to ${propLayout.name}`;
            } else if (developmentType === 'pr') {
                if (!PR_IS_FIFTH_DEVELOPMENT) throw new Error("Permanent Residence is not applicable for this property.");
                if (propData.permanentResidence) throw new Error("Property already has Permanent Residence.");
                if (propData.tenancies < MAX_TENANCIES_BEFORE_PR) throw new Error(`Must have ${MAX_TENANCIES_BEFORE_PR} tenancies to build PR.`);
                newPR = true;
                developmentMessage = `built Permanent Residence on ${propLayout.name}`;
    } else {
                throw new Error("Invalid development type.");
            }

            if (playerState.money < cost) {
                throw new Error(`Insufficient funds. Need £${cost}.`);
            }

            const updates = {};
            updates[`players.${currentUserId}.money`] = playerState.money - cost;

            const updatedPropertyDataArray = freshGameData.propertyData.map((p, index) => {
                if (index === propDataIndex) {
                    return { ...p, tenancies: newTenancies, permanentResidence: newPR };
                }
                return p;
            });
        updates.propertyData = updatedPropertyDataArray;
            updates.bankMoney = (freshGameData.bankMoney || 0) + cost;

            updates.lastActionMessage = `${playerState.name} ${developmentMessage} for £${cost}.`;
            updates.updatedAt = serverTimestamp();

            transaction.update(gameDocRef, updates);
            logEvent("Development successful in transaction:", updates);
        });

        playConstructionSound(); // Play sound after successful development
        // Instead of closing the panel, refresh the options with the latest game data
        const freshSnapshot = await getDoc(doc(db, "games", currentGameId));
        if (freshSnapshot.exists()) {
            const freshGameData = freshSnapshot.data();
            const updatedPlayerState = freshGameData.players[currentUserId];
            // Only refresh if the player can still develop properties
            if (canPlayerDevelopAnyProperty(updatedPlayerState, freshGameData)) {
                showDevelopPropertyOptions(updatedPlayerState, freshGameData);
            } else {
                developPropertyContainer.style.display = 'none';
                showMessageModal("Development Complete", "No more properties eligible for development.");
            }
        }

    } catch (error) {
        console.error("Error confirming development:", error);
        showMessageModal("Development Error", error.message);
    }
}


// Put this in your main JavaScript file (e.g., script.js)

document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const chatHeaderToggle = document.getElementById('chat-header-toggle'); // The div you click

    // Make sure both elements exist before trying to add an event listener
    if (chatHeaderToggle && chatContainer) {
        chatHeaderToggle.addEventListener('click', () => {
            // This line does the magic:
            // If 'minimized' class is present, it's removed (chat expands).
            // If 'minimized' class is not present, it's added (chat collapses).
            chatContainer.classList.toggle('minimized');
        });
    } else {
        // Optional: Good practice to log if elements aren't found when expected
        if (!chatHeaderToggle) {
            console.error("Chat Header Toggle element (#chat-header-toggle) not found!");
        }
        if (!chatContainer) {
            console.error("Chat Container element (#chat-container) not found!");
        }
    }
});

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', async () => {
    if (firebaseConfigToUse.apiKey === "YOUR_API_KEY" || !firebaseConfigToUse.projectId) {
        onlineSetupMessage.textContent = "CRITICAL: Firebase is not configured. Please update firebaseConfigToUse in the script.";
        console.error("CRITICAL: Firebase configuration is a placeholder. Update it with your actual Firebase project details.");
        createGameButton.disabled = true;
        joinGameButton.disabled = true;
        showMessageModal("SETUP REQUIRED", "Firebase is not configured. Online features are disabled. See console for details.");
        return;
    }
    reformatBoardLayout();
    // Bypass password requirement - always show setup screen
    loginVerified = true;
    window.loginVerified = true;
    onlineSetupScreen.style.display = 'flex';
    await initializeFirebase();
    window.dispatchEvent(new Event('login-success'));

    const overlay = document.querySelector('.overlay');
    if(overlay) overlay.style.display = 'none';

    // Global single click listener for swap interaction (confirm/cancel)
    document.addEventListener('click', async function(e) {
        if (!window._propertySwapState || !window._propertySwapState.swapActive || !window._propertySwapState.cardA || !window._propertySwapState.cardB) {
            // Only proceed if a full proposal is active (cardA and cardB selected)
            return;
        }
    
        const clickedElement = e.target.closest('.space.property, .space.set-property');
        if (!clickedElement) return; // Clicked outside a property
    
        const clickedPropId = parseInt(clickedElement.id.replace('space-', ''));
        const gameDataForClick = localGameData; // Use a stable snapshot
        const gameDocRef = doc(db, "games", currentGameId);
    
        const { cardA, cardB, swapInitiatorPlayerId } = window._propertySwapState;
    
        // Check if the clicked property is one of the two involved in the active swap
        if (clickedPropId === cardA.propId || clickedPropId === cardB.propId) {
            // Ensure the player clicking is one of the two involved in the swap
            if (currentUserId === cardA.playerId || currentUserId === cardB.playerId) {
                logEvent(`Swap INTERACTION (click): Player ${currentUserId} clicked flashing property ${clickedPropId}.`);
    
                if (window._propertySwapState.swapTimeout) {
                    clearTimeout(window._propertySwapState.swapTimeout);
                    window._propertySwapState.swapTimeout = null;
                }
    
                // If Player A (initiator) clicks their own card (cardA) OR Player B (target) clicks Player A's card (cardA) -> CANCEL
                if (clickedPropId === cardA.propId && (currentUserId === cardA.playerId || currentUserId === cardB.playerId) ) {
                     logEvent(`Swap CANCELLED by ${currentUserId} clicking initiator's card (${cardA.propId}).`);
                     await updateDoc(gameDocRef, {
                         flashingProperties: [],
                         lastActionMessage: `Property swap cancelled by ${gameDataForClick.players[currentUserId]?.name || 'a player'}.`,
                         updatedAt: serverTimestamp()
                     });
                }
                // If Player B (target) clicks their own card (cardB) OR Player A (initiator) clicks Player B's card (cardB) -> CONFIRM SWAP
                else if (clickedPropId === cardB.propId && (currentUserId === cardB.playerId || currentUserId === cardA.playerId)) {
                    logEvent(`Swap CONFIRMED by ${currentUserId} clicking target's card (${cardB.propId}). Performing swap.`);
                    await performPropertySwap(cardA, cardB, gameDataForClick);
                }
                
                // Reset global state after any valid interaction (confirm or cancel)
                window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
    
            } else {
                logEvent(`Swap Click Ignored: Player ${currentUserId} (not involved) clicked a flashing card.`);
            }
        }
    }, false); // Bubbling phase

    // Add drag handle to #game-info-area after DOMContentLoaded
    window.addEventListener('DOMContentLoaded', function() {
        const infoArea = document.getElementById('game-info-area');
        if (infoArea && !infoArea.querySelector('.drag-handle')) {
            const dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';
            dragHandle.textContent = 'Player Info';
            infoArea.insertBefore(dragHandle, infoArea.firstChild);

            let isDragging = false;
            let startX, startY, origX, origY;

            function onPointerDown(e) {
                isDragging = true;
                infoArea.classList.add('draggable');
                startX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
                startY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
                const rect = infoArea.getBoundingClientRect();
                origX = rect.left;
                origY = rect.top;
                document.addEventListener('mousemove', onPointerMove);
                document.addEventListener('mouseup', onPointerUp);
                document.addEventListener('touchmove', onPointerMove, {passive: false});
                document.addEventListener('touchend', onPointerUp);
            }
            function onPointerMove(e) {
                if (!isDragging) return;
                e.preventDefault();
                const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
                const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
                const dx = clientX - startX;
                const dy = clientY - startY;
                infoArea.style.left = (origX + dx) + 'px';
                infoArea.style.top = (origY + dy) + 'px';
                infoArea.style.right = 'auto';
            }
            function onPointerUp() {
                isDragging = false;
                infoArea.classList.remove('draggable');
                document.removeEventListener('mousemove', onPointerMove);
                document.removeEventListener('mouseup', onPointerUp);
                document.removeEventListener('touchmove', onPointerMove);
                document.removeEventListener('touchend', onPointerUp);
            }
            dragHandle.addEventListener('mousedown', onPointerDown);
            dragHandle.addEventListener('touchstart', onPointerDown, {passive: false});
        }
    });
});

document.body.addEventListener('click', async () => {
    if (!audioContextStarted && typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
        try {
            await Tone.start();
            audioContextStarted = true;
            logEvent("AudioContext started by user interaction.");
            // It's better to initialize synths when they are needed or once after context starts,
            // rather than re-initializing toneSynth here if it might already exist.
            // The existing logic for toneSynth initialization seems fine if it's done after Tone.start().
            if (!toneSynth && Tone.Synth) { // Check if toneSynth is not already initialized
                toneSynth = new Tone.Synth({
                    oscillator: { type: "triangle" }, // Default, will be overridden by specific sound functions if they create their own
                    envelope: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.3 }
                }).toDestination();
                logEvent("Fallback Tone.Synth initialized after body click.");
            }
            loadConstructionSound(); // Attempt to load construction sound after audio context is started
        } catch (e) {
            console.error("Error starting Tone.js AudioContext or initializing synth:", e);
        }
    }
}, { once: true });

// --- Card Draw and Action Logic ---
async function setCurrentCardDraw(card, type, playerId) {
    const gameDocRef = doc(db, "games", currentGameId);
    await updateDoc(gameDocRef, {
        currentCardDraw: {
            id: `${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
            type,
            text: card.text,
            action: card.action,
            amount: card.amount || null,
            amountPerTenancy: card.amountPerTenancy || null,
            amountPerPR: card.amountPerPR || null,
            playerId,
        },
        updatedAt: serverTimestamp(),
    });
}

function showCardModal(card, type, onOkCallback) {
    if (autoRollDiceTimeout) {
        clearTimeout(autoRollDiceTimeout);
        autoRollDiceTimeout = null;
        logEvent("Showing card modal, cleared auto-roll dice timeout.");
    }
    if (!onBoardCardDisplayDiv || !onBoardCardTypeH4 || !onBoardCardTextP) return;
    onBoardCardTypeH4.textContent = `${type} Card`;
    onBoardCardTextP.textContent = card.text;
    // Style the card text to be bold and black
    onBoardCardTextP.style.color = 'black';
    onBoardCardTextP.style.fontWeight = 'bold';

    onBoardCardDisplayDiv.style.display = 'flex';

    const playerWhoDrew = localGameData.players[card.playerId];
    const amIEligibleToProcess = card.playerId === currentUserId || (playerWhoDrew?.isAI && currentUserId === localGameData.hostId);
    
    // Function to close the card modal
    const closeCardModal = () => {
        if (!amIEligibleToProcess) return;
        onBoardCardDisplayDiv.style.display = 'none';
        if (onOkCallback) onOkCallback();
    };

    // Automatically close after 1.5 seconds
    setTimeout(closeCardModal, 1500);
}


async function drawAndShowOpportunityCard(playerId) {
    const gameData = localGameData;
    if (!gameData || !gameData.shuffledOpportunityCards) {
        logEvent("drawAndShowOpportunityCard: Missing gameData or shuffledOpportunityCards.");
        return;
    }
    let cardIndex = gameData.opportunityCardIndex || 0;
    let deck = [...gameData.shuffledOpportunityCards];

    if (cardIndex >= deck.length) {
        logEvent("Reshuffling Opportunity Deck");
        deck = shuffleDeck([...opportunityCards]);
        cardIndex = 0;
        await updateDoc(doc(db, "games", currentGameId), {
            shuffledOpportunityCards: deck,
            opportunityCardIndex: 0
        });
    }
    const card = deck[cardIndex];
    await setCurrentCardDraw(card, 'Opportunity', playerId);
    await updateDoc(doc(db, "games", currentGameId), {
        opportunityCardIndex: cardIndex + 1,
    });
}

async function drawAndShowWelfareCard(playerId) {
    const gameData = localGameData;
    if (!gameData || !gameData.shuffledWelfareCards) {
        logEvent("drawAndShowWelfareCard: Missing gameData or shuffledWelfareCards.");
        return;
    }
    let cardIndex = gameData.welfareCardIndex || 0;
    let deck = [...gameData.shuffledWelfareCards];

    if (cardIndex >= deck.length) {
        logEvent("Reshuffling Welfare Deck");
        deck = shuffleDeck([...welfareCards]);
        cardIndex = 0;
        await updateDoc(doc(db, "games", currentGameId), {
            shuffledWelfareCards: deck,
            welfareCardIndex: 0
        });
    }
    const card = deck[cardIndex];
    await setCurrentCardDraw(card, 'Welfare', playerId);
    await updateDoc(doc(db, "games", currentGameId), {
        welfareCardIndex: cardIndex + 1,
    });
}


async function applyCardAction(card, playerId, deckType) {
    logEvent(`Applying card action: ${card.action} for player ${playerId}`, card);
    const gameDocRef = doc(db, "games", currentGameId);
    let sentToDetentionByCard = false; // Declare here

    let playerWentBankrupt = false;
    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) throw new Error("Game not found for card action.");
            const freshGameData = freshGameDoc.data();
            const playerState = freshGameData.players[playerId];
            if (!playerState || playerState.isBankrupt) {
                logEvent(`Card action for ${playerId} skipped: Player not found or bankrupt.`);
                transaction.update(gameDocRef, { currentCardDraw: null, updatedAt: serverTimestamp(), lastActionMessage: `${playerState?.name || 'A player'} drew: ${card.text} (No action due to bankruptcy/state)` });
                return;
            }

            let updates = { updatedAt: serverTimestamp() };
            let messages = [`${playerState.name} ${playerState.isAI ? "(AI)" : ""} drew (${deckType}): \"${card.text}\"`];

            // Play wives sound for specific cards
            if (card.text.includes("Forced Marriage") || card.text.includes("Child Wives") || card.text.includes("I Dont speak English")) {
                playWivesSound();
            }

            switch(card.action) {
                case 'collect':
                    updates[`players.${playerId}.money`] = (playerState.money || 0) + (card.amount || 0);
                    messages.push(`Collected £${card.amount}.`);
                    break;
                case 'pay':
                    const costToPay = Math.round((card.amount || 0) * deductionMultiplier);
                    if (playerState.money >= costToPay) {
                        updates[`players.${playerId}.money`] = playerState.money - costToPay;
                        updates.bankMoney = (freshGameData.bankMoney || 0) + costToPay;
                        messages.push(`Paid £${costToPay} to the bank.`);
                    } else {
                        updates.bankMoney = (freshGameData.bankMoney || 0) + playerState.money;
                        updates[`players.${playerId}.money`] = 0;
                        updates[`players.${playerId}.isBankrupt`] = true;
                        messages.push(`Could not afford £${costToPay}, paid £${playerState.money} and is BANKRUPT!`);
                        // --- Property release on bankruptcy ---
                        if (Array.isArray(freshGameData.propertyData)) {
                            const updatedPropertyData = freshGameData.propertyData.map(prop => {
                                if (prop.owner === playerId) {
                                    return { ...prop, owner: null };
                                }
                                return prop;
                            });
            updates.propertyData = updatedPropertyData;
                        }
                        updates[`players.${playerId}.propertiesOwned`] = [];
                        playerWentBankrupt = true;
                    }
                    break;
                case 'getOutOfDetentionFree':
                    updates[`players.${playerId}.getOutOfDetentionCards`] = (playerState.getOutOfDetentionCards || 0) + 1;
                    messages.push(`Received a Legal Aid card.`);
                    break;
                case 'gainHealthService':
                    updates[`players.${playerId}.healthServices`] = (playerState.healthServices || 0) + 1;
                    messages.push(`Gained a Health Service.`);
                    break;
                case 'gainStealCard':
                    updates[`players.${playerId}.stealCards`] = (playerState.stealCards || 0) + 1;
                    messages.push(`Gained a Steal card.`);
                    break;
                case 'payPerDevelopment':
                    let totalDevelopmentCost = 0;
                    playerState.propertiesOwned.forEach(propId => {
                        const propData = freshGameData.propertyData.find(p => p.id === propId);
                        if (propData) {
                            totalDevelopmentCost += (propData.tenancies || 0) * ((card.amountPerTenancy || 0) * deductionMultiplier);
                            if (propData.permanentResidence) {
                                totalDevelopmentCost += ((card.amountPerPR || 0) * deductionMultiplier);
                            }
                        }
                    });
                    if (totalDevelopmentCost > 0) {
                        if (playerState.money >= totalDevelopmentCost) {
                            updates[`players.${playerId}.money`] = playerState.money - totalDevelopmentCost;
                            updates.bankMoney = (freshGameData.bankMoney || 0) + totalDevelopmentCost;
                            messages.push(`Paid £${totalDevelopmentCost} for housing inspection.`);
                        } else {
                            updates.bankMoney = (freshGameData.bankMoney || 0) + playerState.money;
                            updates[`players.${playerId}.money`] = 0;
                            updates[`players.${playerId}.isBankrupt`] = true;
                            messages.push(`Could not afford housing inspection of £${totalDevelopmentCost}, paid £${playerState.money} and is BANKRUPT!`);
                            // --- Property release on bankruptcy ---
                            if (Array.isArray(freshGameData.propertyData)) {
                                const updatedPropertyData = freshGameData.propertyData.map(prop => {
                                    if (prop.owner === playerId) {
                                        return { ...prop, owner: null };
                                    }
                                    return prop;
                                });
                                updates.propertyData = updatedPropertyData;
                            }
                            updates[`players.${playerId}.propertiesOwned`] = [];
                        }
                    } else {
                        messages.push(`No developed properties, no inspection fee.`);
                    }
                    break;
                case 'moveToNearestPayout':
                    let currentPos = playerState.position;
                    let nearestPayoutId = -1;
                    let minDistance = freshGameData.boardLayout.length;
                    let passedGoOnCardMove = false;

                    freshGameData.boardLayout.forEach(space => {
                        if (space.type === 'payout') {
                            let dist = (space.id - currentPos + freshGameData.boardLayout.length) % freshGameData.boardLayout.length;
                            if (dist === 0 && space.id !== currentPos) dist = freshGameData.boardLayout.length;
                            else if (dist === 0 && space.id === currentPos) dist = freshGameData.boardLayout.length;

                            if (dist < minDistance) {
                                minDistance = dist;
                                nearestPayoutId = space.id;
                                if (currentPos + dist >= freshGameData.boardLayout.length && nearestPayoutId !== 0) {
                                    passedGoOnCardMove = true;
                                } else if (nearestPayoutId === 0 && currentPos !==0) {
                                    passedGoOnCardMove = true;
                                } else {
                                    passedGoOnCardMove = false; 
                                }
                            }
                        }
                    });
                    if (nearestPayoutId !== -1) {
                        updates[`players.${playerId}.position`] = nearestPayoutId;
                        messages.push(`Moved to ${freshGameData.boardLayout[nearestPayoutId].name}.`);

                        let currentMoneyForCard = updates[`players.${playerId}.money`] !== undefined ? updates[`players.${playerId}.money`] : playerState.money;

                        if (passedGoOnCardMove) {
                            currentMoneyForCard += GO_BONUS;
                            updates.ukGovMoney = (updates.ukGovMoney !== undefined ? updates.ukGovMoney : freshGameData.ukGovMoney) - GO_BONUS;
                            updates[`players.${playerId}.govReceived`] = (updates[`players.${playerId}.govReceived`] || playerState.govReceived || 0) + GO_BONUS;
                            messages.push(`Passed Dole and collected £${GO_BONUS}.`);

                            // Play token specific sound
                            playTokenSoundForPlayer(playerState);
                        }

                        const payoutSpace = freshGameData.boardLayout[nearestPayoutId];
                        if (payoutSpace.amount) {
                            currentMoneyForCard += payoutSpace.amount;
                            updates.ukGovMoney = (updates.ukGovMoney !== undefined ? updates.ukGovMoney : freshGameData.ukGovMoney) - payoutSpace.amount;
                            updates[`players.${playerId}.govReceived`] = (updates[`players.${playerId}.govReceived`] || playerState.govReceived || 0) + payoutSpace.amount;
                            messages.push(`Collected £${payoutSpace.amount}.`);
                        }
                        updates[`players.${playerId}.money`] = currentMoneyForCard;
                    }
                    break;
                case 'goToDetentionDirect':
                    updates[`players.${playerId}.position`] = detentionCenterSpaceId;
                    updates[`players.${playerId}.inDetention`] = true;
                    updates[`players.${playerId}.missedTurnsInDetention`] = 0;
                    updates[`players.${playerId}.doublesRolledInTurn`] = 0;
                    updates[`players.${playerId}.playerActionTakenThisTurn`] = true;
                    messages.push(`Sent directly to Detention Center.`);
                    sentToDetentionByCard = true;
                    break;
                case 'housingVoucher':
                    updates[`players.${playerId}.hasHousingVoucher`] = true;
                    messages.push(`Received a Housing Voucher (25% off next estate).`);
                    break;
                case 'collectFromPlayers':
                    const amountPerPlayer = Math.round((card.amount || 0) * deductionMultiplier);
                    let totalCollectedFromOthers = 0;
                    freshGameData.playerOrder.forEach(otherPlayerId => {
                        if (otherPlayerId !== playerId) {
                            const otherPlayerState = freshGameData.players[otherPlayerId];
                            if (otherPlayerState && !otherPlayerState.isBankrupt) {
                                if (otherPlayerState.money >= amountPerPlayer) {
                                    updates[`players.${otherPlayerId}.money`] = otherPlayerState.money - amountPerPlayer;
                                    totalCollectedFromOthers += amountPerPlayer;
                                } else {
                                    totalCollectedFromOthers += otherPlayerState.money;
                                    updates[`players.${otherPlayerId}.money`] = 0;
                                    updates[`players.${otherPlayerId}.isBankrupt`] = true;
                                    messages.push(`${otherPlayerState.name} ${otherPlayerState.isAI ? "(AI)" : ""} couldn't pay £${amountPerPlayer} and is BANKRUPT!`);
                                    // --- Property release on bankruptcy ---
                                    if (Array.isArray(freshGameData.propertyData)) {
                                        const updatedPropertyData = freshGameData.propertyData.map(prop => {
                                            if (prop.owner === otherPlayerId) {
                                                return { ...prop, owner: null };
                                            }
                                            return prop;
                                        });
                                        updates.propertyData = updatedPropertyData;
                                    }
                                    updates[`players.${otherPlayerId}.propertiesOwned`] = [];
                                }
                            }
                        }
                    });
                    updates[`players.${playerId}.money`] = (playerState.money || 0) + totalCollectedFromOthers;
                    messages.push(`Collected a total of £${totalCollectedFromOthers} from other players.`);
                    break;
                case 'advanceToGo':
                    updates[`players.${playerId}.position`] = 0;
                    messages.push(`Advanced to Dole.`);
                    updates[`players.${playerId}.money`] = (updates[`players.${playerId}.money`] !== undefined ? updates[`players.${playerId}.money`] : playerState.money) + GO_BONUS;
                    updates.ukGovMoney = (updates.ukGovMoney !== undefined ? updates.ukGovMoney : freshGameData.ukGovMoney) - GO_BONUS;
                    updates[`players.${playerId}.govReceived`] = (updates[`players.${playerId}.govReceived`] || playerState.govReceived || 0) + GO_BONUS;
                    messages.push(`Collected £${GO_BONUS}.`);

                    // Play token specific sound
                    playTokenSoundForPlayer(playerState);
                    break;
                default:
                    messages.push(`(Action '${card.action}' not fully implemented).`);
                    logEvent("Unknown or not-yet-implemented card action:", card.action);
            }

            updates.lastActionMessage = messages.join(" ");
            updates.currentCardDraw = null;
            transaction.update(gameDocRef, updates);
        });
        // --- NEW: If player just went bankrupt and it is their turn, auto-end their turn ---
        if (playerWentBankrupt && localGameData && localGameData.playerOrder && localGameData.playerOrder[localGameData.currentPlayerIndex] === playerId) {
            setTimeout(() => { handleEndTurnAction(); }, 500);
        }
        logEvent("Card action transaction completed.");

        if (sentToDetentionByCard) {
            logEvent(`Player ${playerId} was sent to detention by card. Ending turn immediately.`);
            await handleEndTurnAction();
        }

    } catch (error) {
        console.error("Error applying card action (transaction phase):", error);
        showMessageModal("Card Action Error", "Could not apply card effect: " + error.message);
        await updateDoc(gameDocRef, { currentCardDraw: null, updatedAt: serverTimestamp(), lastActionMessage: `Error processing card: ${card.text}` });
    }
}

function calculateSpecialSetRent(propertyLayout, ownerId, gameData) {
    if (!propertyLayout || propertyLayout.groupId !== 'special_set' || !gameData || !gameData.propertyData) {
        logEvent("calculateSpecialSetRent: Invalid inputs or not a special_set property.", {propertyLayout, ownerId});
        return 0;
    }

    const ownedSpecialPropertiesCount = gameData.propertyData.filter(pData => {
        const pLayout = gameData.boardLayout.find(s => s.id === pData.id);
        return pLayout && pLayout.groupId === 'special_set' && pData.owner === ownerId;
    }).length;

    if (ownedSpecialPropertiesCount > 0) {
        const rent = 150 * ownedSpecialPropertiesCount;
        logEvent(`calculateSpecialSetRent: Owner ${ownerId} owns ${ownedSpecialPropertiesCount} special_set properties. Rent: £${rent}`);
        return rent;
    }
    logEvent(`calculateSpecialSetRent: Owner ${ownerId} owns 0 special_set properties. Rent: £0`);
    return 0;
}

async function payRent(payerState, propertyDataEntry, propertyLayoutDetails, gameData) {
    if (payerState.isBankrupt) {
        logEvent(`Rent skipped: Payer ${payerState.name} is already bankrupt.`);
        return;
    }

    const ownerId = propertyDataEntry.owner;
    if (!ownerId || ownerId === payerState.id) {
        return;
    }

    const ownerState = gameData.players[ownerId];
    if (!ownerState || ownerState.isBankrupt) {
        logEvent(`Rent skipped: Owner ${ownerState?.name || `ID ${ownerId}`} is bankrupt or not found for ${propertyLayoutDetails.name}.`);
        return;
    }

    // Check if owner is in detention
    if (ownerState.inDetention) {
        logEvent(`Rent skipped: Owner ${ownerState.name} is in detention and cannot collect rent for ${propertyLayoutDetails.name}.`);
        return;
    }

    let rentAmount = 0;

    if (propertyLayoutDetails.type === "set_property") {
        rentAmount = calculateSpecialSetRent(propertyLayoutDetails, ownerId, gameData);
        logEvent(`${payerState.name} ${payerState.isAI ? "(AI)" : ""} owes £${rentAmount} rent to ${ownerState.name} ${ownerState.isAI ? "(AI)" : ""} for ${propertyLayoutDetails.name} (Special Set).`);
    } else if (propertyLayoutDetails.type === "property") {
        // New Crack House rent calculation
        if (propertyLayoutDetails.groupId === "darkgrey") {
            const ownedCrackHousesCount = gameData.propertyData.filter(pData => {
                const pLayout = gameData.boardLayout.find(s => s.id === pData.id);
                return pLayout && pLayout.groupId === "darkgrey" && pData.owner === ownerId;
            }).length;
            rentAmount = 275 * ownedCrackHousesCount; // Updated from 150 to 200
            logEvent(`${payerState.name} ${payerState.isAI ? "(AI)" : ""} owes £${rentAmount} rent to ${ownerState.name} ${ownerState.isAI ? "(AI)" : ""} for ${propertyLayoutDetails.name} (Crack House). Owner has ${ownedCrackHousesCount} crack house(s).`);
        } else {
            // Standard property rent calculation
            const groupPropertiesLayout = gameData.boardLayout.filter(s => s.groupId === propertyLayoutDetails.groupId && s.type === 'property');
            const ownerOwnsAllInGroup = groupPropertiesLayout.every(gpLayout => {
                const gpDataForCheck = gameData.propertyData.find(pd => pd.id === gpLayout.id);
                return gpDataForCheck && gpDataForCheck.owner === ownerId;
            });

            if (propertyDataEntry.permanentResidence) {
                rentAmount = propertyLayoutDetails.rent[MAX_TENANCIES_BEFORE_PR + 1] || propertyLayoutDetails.rent[propertyLayoutDetails.rent.length -1];
            } else if (propertyDataEntry.tenancies > 0) {
                rentAmount = propertyLayoutDetails.rent[propertyDataEntry.tenancies] || 0;
            } else {
                rentAmount = propertyLayoutDetails.rent[0] || 0;
                if (ownerOwnsAllInGroup) {
                    rentAmount *= 2;
                    logEvent(`Rent for ${propertyLayoutDetails.name} is doubled to £${rentAmount} (unimproved, owns all in group).`);
                }
            }
            logEvent(`${payerState.name} ${payerState.isAI ? "(AI)" : ""} owes £${rentAmount} rent to ${ownerState.name} ${ownerState.isAI ? "(AI)" : ""} for ${propertyLayoutDetails.name} (Tenancies: ${propertyDataEntry.tenancies}, PR: ${propertyDataEntry.permanentResidence}).`);
        }
    } else {
        logEvent(`Cannot calculate rent for ${propertyLayoutDetails.name} - unknown type or configuration.`);
        return;
    }

    if (rentAmount > 0) {
        const paymentDetails = await makePaymentTransaction(payerState.id, ownerId, rentAmount, `rent for ${propertyLayoutDetails.name}`);
        logEvent(`Rent payment outcome for ${payerState.name}: ${paymentDetails.message}`);

        if (paymentDetails.success && !paymentDetails.payerBankrupt) {
            const gameDocRef = doc(db, "games", currentGameId);
            await updateDoc(gameDocRef, {
                lastRentEvent: {
                    id: `${Date.now()}_rent_${Math.random().toString(36).substr(2,5)}`,
                    payerName: `${payerState.name}${payerState.isAI ? " (AI)" : ""}`,
                    recipientName: `${ownerState.name}${ownerState.isAI ? " (AI)" : ""}`,
                    amount: rentAmount,
                    propertyName: propertyLayoutDetails.name,
                    timestamp: serverTimestamp()
                },
                updatedAt: serverTimestamp()
            });
        }
    } else {
        logEvent(`Calculated rent is £0 for ${propertyLayoutDetails.name}. No payment made.`);
    }
}



async function handleAITurn(gameData, aiPlayerId) {
    logEvent(`AI Turn: ${aiPlayerId} (${gameData.players[aiPlayerId]?.name || 'Unknown'}) - Host (${currentUserId}) is processing.`);
    const aiPlayerState = gameData.players[aiPlayerId];
    const gameDocRef = doc(db, "games", currentGameId);

    if (!aiPlayerState || aiPlayerState.isBankrupt) {
        logEvent(`AI ${aiPlayerId} is bankrupt or invalid. Ending turn.`);
        try {
            await handleEndTurnAction();
        } catch (error) {
            logEvent(`Error ending turn for bankrupt/invalid AI ${aiPlayerId}: ${error.message}`, error);
        } finally {
            if (window._aiTurnInProgress) {
                window._aiTurnInProgress = false;
                logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (bankrupt/invalid).`);
            }
        }
        return;
    }

    // --- START: AI Development Logic at Start of Turn ---
    // (This section seems to have been moved or refactored, placeholder if it needs to be restored here)
    // For now, assuming development logic primarily happens after moving or as a separate action.
    // Original logic for initial development check:
    if (!aiPlayerState.inDetention && (gameData.settings?.aiDevelopAtTurnStart ?? true)) {
        logEvent(`AI ${aiPlayerId} checking for development opportunities at start of turn.`);
        // Fetch fresh game data for development decisions
        const freshDevSnapshot = await getDoc(gameDocRef);
        if (freshDevSnapshot.exists()) {
            const freshDevGameData = freshDevSnapshot.data();
            const freshAIPlayerState = freshDevGameData.players[aiPlayerId];
            if (freshAIPlayerState && !freshAIPlayerState.isBankrupt && !freshAIPlayerState.inDetention) {
                await processAIDevelopment(freshDevGameData, aiPlayerId, gameDocRef);
            }
        }
    }
    // --- END: AI Development Logic at Start of Turn ---


    if (!gameData.status || gameData.status !== "active" || gameData.preGamePhase) {
        logEvent(`AI ${aiPlayerId} turn skipped: Game not active or in pre-game phase. Status: ${gameData.status}, PreGame: ${gameData.preGamePhase}`);
        if (window._aiTurnInProgress) {
            window._aiTurnInProgress = false;
            logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (game not active/pre-game).`);
        }
        return;
    }

    // Handle detention
    if (aiPlayerState.inDetention && !aiPlayerState.playerActionTakenThisTurn) {
        logEvent(`AI ${aiPlayerId} is in detention.`);
        
        try {
            // First try to use a Legal Aid Card if available
            if (aiPlayerState.getOutOfDetentionCards > 0) {
                logEvent(`AI ${aiPlayerId} using Legal Aid Card to get out of detention.`);
                await updateDoc(gameDocRef, {
                    [`players.${aiPlayerId}.getOutOfDetentionCards`]: aiPlayerState.getOutOfDetentionCards - 1,
                    [`players.${aiPlayerId}.inDetention`]: false,
                    [`players.${aiPlayerId}.missedTurnsInDetention`]: 0,
                    [`players.${aiPlayerId}.playerActionTakenThisTurn`]: false,
                    [`players.${aiPlayerId}.attemptedDetentionRollThisStay`]: false,
                    lastActionMessage: `${aiPlayerState.name} used a Legal Aid card and is free. Roll to move.`,
                    updatedAt: serverTimestamp()
                });
                if (window._aiTurnInProgress) {
                    window._aiTurnInProgress = false;
                    logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (used Legal Aid card).`);
                }
                return; // Exit to let the next AI turn handle the movement
            }
            
            // Then try to pay the fine if they have enough money
            const fineAmount = Math.round(50 * deductionMultiplier);
            if (aiPlayerState.money >= fineAmount) {
                logEvent(`AI ${aiPlayerId} paying £${fineAmount} fine to get out of detention.`);
                await updateDoc(gameDocRef, {
                    [`players.${aiPlayerId}.money`]: aiPlayerState.money - fineAmount,
                    [`players.${aiPlayerId}.inDetention`]: false,
                    [`players.${aiPlayerId}.missedTurnsInDetention`]: 0,
                    [`players.${aiPlayerId}.playerActionTakenThisTurn`]: false,
                    [`players.${aiPlayerId}.attemptedDetentionRollThisStay`]: false,
                    bankMoney: (gameData.bankMoney || 0) + fineAmount,
                    lastActionMessage: `${aiPlayerState.name} paid £${fineAmount} fine and is free. Roll to move.`,
                    updatedAt: serverTimestamp()
                });
                if (window._aiTurnInProgress) {
                    window._aiTurnInProgress = false;
                    logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (paid fine).`);
                }
                return; // Exit to let the next AI turn handle the movement
            }
            
            // Finally, try rolling for doubles if haven't attempted yet
            if (!aiPlayerState.attemptedDetentionRollThisStay) {
                const die1 = Math.floor(Math.random() * 6) + 1;
                const die2 = Math.floor(Math.random() * 6) + 1;
                const isDoubles = die1 === die2;
                const totalRoll = die1 + die2;
                
                let updates = {
                    updatedAt: serverTimestamp(),
                    lastDiceRoll: {die1, die2, total: totalRoll, isDoubles: isDoubles, playerId: aiPlayerId, rollId: `${Date.now()}-detention`},
                    [`players.${aiPlayerId}.attemptedDetentionRollThisStay`]: true,
                    [`players.${aiPlayerId}.playerActionTakenThisTurn`]: true
                };
                
                if (isDoubles) {
                    updates[`players.${aiPlayerId}.inDetention`] = false;
                    updates[`players.${aiPlayerId}.missedTurnsInDetention`] = 0;
                    updates[`players.${aiPlayerId}.playerActionTakenThisTurn`] = false;
                    updates[`players.${aiPlayerId}.attemptedDetentionRollThisStay`] = false;
                    updates.lastActionMessage = `${aiPlayerState.name} rolled doubles (${die1},${die2}) and is out of Detention! Roll again to move.`;
                } else {
                    updates[`players.${aiPlayerId}.missedTurnsInDetention`] = (aiPlayerState.missedTurnsInDetention || 0) + 1;
                    updates.lastActionMessage = `${aiPlayerState.name} failed to roll doubles (${die1},${die2}). Must wait in detention.`;
                }
                
                await updateDoc(gameDocRef, updates);
                
                if (!isDoubles) {
                    // If doubles weren't rolled, end the turn
                    await handleEndTurnAction();
                    if (window._aiTurnInProgress) {
                        window._aiTurnInProgress = false;
                        logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (failed detention roll).`);
                    }
                    return;
                }
                return; // If doubles were rolled, exit to let the next AI turn handle the movement
            }
            
            // If we get here, we've already attempted a roll this stay and failed
            logEvent(`AI ${aiPlayerId} has already attempted to roll for doubles this detention stay. Ending turn.`);
            await updateDoc(gameDocRef, {
                [`players.${aiPlayerId}.playerActionTakenThisTurn`]: true,
                [`players.${aiPlayerId}.missedTurnsInDetention`]: (aiPlayerState.missedTurnsInDetention || 0) + 1,
                updatedAt: serverTimestamp()
            });
            await handleEndTurnAction();
            if (window._aiTurnInProgress) {
                window._aiTurnInProgress = false;
                logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (already attempted detention roll).`);
            }
            return;
            
        } catch (detentionError) {
            logEvent(`AI ${aiPlayerId} detention action failed: ${detentionError.message}`, detentionError);
            try { 
                await updateDoc(gameDocRef, {
                    [`players.${aiPlayerId}.playerActionTakenThisTurn`]: true,
                    updatedAt: serverTimestamp()
                });
                await handleEndTurnAction(); 
            } catch (e) { 
                logEvent(`Error in detention error handler: ${e.message}`);
            }
            if (window._aiTurnInProgress) {
                window._aiTurnInProgress = false;
                logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (detention exception).`);
            }
            return;
        }
    } // End of detention handling block

    // Fetch fresh game state for decisions AFTER detention logic might have run.
    const freshGameDataAfterDetentionSnap = await getDoc(gameDocRef);
    if (!freshGameDataAfterDetentionSnap.exists()) {
        if (window._aiTurnInProgress) {
            window._aiTurnInProgress = false;
            logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (game doc disappeared before main roll).`);
        }
        return;
    }
    const currentTurnGameData = freshGameDataAfterDetentionSnap.data();
    const aiCurrentState = currentTurnGameData.players[aiPlayerId];

    // Re-check bankruptcy (e.g., from card action if detention was skipped)
    if (!aiCurrentState || aiCurrentState.isBankrupt) {
        logEvent(`AI ${aiPlayerId} is now bankrupt or invalid after detention block. Ending turn.`);
        if (!aiCurrentState?.playerActionTakenThisTurn) {
             await updateDoc(gameDocRef, { [`players.${aiPlayerId}.playerActionTakenThisTurn`]: true, updatedAt: serverTimestamp() });
        }
        try { await handleEndTurnAction(); }
        catch (e) { logEvent(`Error ending turn for AI ${aiPlayerId} who became bankrupt after detention: ${e.message}`);}
        if (window._aiTurnInProgress) {
            window._aiTurnInProgress = false;
            logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (bankrupt after detention logic).`);
        }
        return;
    }

    // Main roll logic if not in detention and action not yet taken
    if (!aiCurrentState.playerActionTakenThisTurn && !aiCurrentState.inDetention) {
        logEvent(`AI ${aiPlayerId} rolling dice (post-detention check).`);
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const totalRoll = die1 + die2;
        let isDoubles = die1 === die2;
        const rollId = `${Date.now()}-${crypto.randomUUID()}`;
        // Track doubles count across transaction and after it for early re-roll logic
        let updatedDoublesCount = aiCurrentState.doublesRolledInTurn || 0;
        let postMoveAIState = null; // Will hold AI state after move for re-roll/logic

        try { // This try block covers dice roll, animation, transaction, and post-transaction actions
            // ... (dice sound, UI display, animation - existing code for these actions) ...
            if (audioContextStarted && toneSynth) {
                toneSynth.triggerAttackRelease("C4", "16n", Tone.now());
                setTimeout(() => { if (toneSynth) toneSynth.triggerAttackRelease("E4", "16n", Tone.now() + 0.1); }, 100);
            }
            updateDiceUIDisplay({
                lastDiceRoll: { die1, die2, total: totalRoll, isDoubles, playerId: aiPlayerId },
                gamePhase: "main",
                preGamePhase: false
            });
            await new Promise(resolve => setTimeout(resolve, 400)); // AI dice display pause
            const playerStartPos = aiCurrentState.position;
            await animatePlayerMove(aiPlayerId, playerStartPos, totalRoll, currentTurnGameData.boardLayout);
            window._processedAnimationRollIds.add(rollId);
            logEvent(`AI ${aiPlayerId} move animated locally, rollId ${rollId} added to processed set.`);


            let landedSpaceId; // Will be set within the transaction
            let rentPaymentRequired = false; // Will be set within the transaction
            let rentPayerId, rentPropertyId; // For post-transaction rent payment

            try { // Firestore Transaction for core move/buy/immediate actions
                await runTransaction(db, async (transaction) => {
                    const txGameDoc = await transaction.get(gameDocRef);
                    if (!txGameDoc.exists()) throw new Error("Game not found during AI roll TX.");
                    const txGameData = txGameDoc.data();
                    const playerStateTX = txGameData.players[aiPlayerId];
                    // ... (all your existing transaction logic: position update, doubles count, go bonus, landed space actions, property purchase, etc.)
                    // This part is assumed to be very complex and mostly correct from your file.
                    // Ensure playerActionTakenThisTurn is set correctly:
                    // playerActionTakenThisTurn = !isDoubles || currentDoublesCount >= 3;
                    // landedSpaceId should be updated here.
                    // rentPaymentRequired, rentPayerId, rentPropertyId should be set if rent is due.

                    // ---- BEGINNING of example TX logic (replace with your actual full TX logic) ----
                    if (!playerStateTX || playerStateTX.isBankrupt) throw new Error("AI player missing/bankrupt in TX.");
                    if (txGameData.playerOrder[txGameData.currentPlayerIndex] !== aiPlayerId) throw new Error("Not AI's turn in TX.");
                    if (playerStateTX.inDetention) throw new Error("AI still in detention in TX.");

                    let newPosition = playerStateTX.position;
                    let messages = [];
                    let updates = {};
                    let currentDoublesCount = playerStateTX.doublesRolledInTurn || 0;

                    if (isDoubles) {
                        currentDoublesCount++;
                    } else {
                        currentDoublesCount = 0;
                    }
                    updates[`players.${aiPlayerId}.doublesRolledInTurn`] = currentDoublesCount;

                    if (isDoubles && currentDoublesCount === 3) {
                        // Go to detention logic
                        messages.push(`${playerStateTX.name} (AI) rolled 3 doubles! Sent to Detention.`);
                        newPosition = detentionCenterSpaceId; // Ensure this is globally available or passed
                        updates[`players.${aiPlayerId}.position`] = newPosition;
                        updates[`players.${aiPlayerId}.inDetention`] = true;
                        updates[`players.${aiPlayerId}.missedTurnsInDetention`] = 0;
                        updates[`players.${aiPlayerId}.playerActionTakenThisTurn`] = true; // Turn ends
                        updates[`players.${aiPlayerId}.doublesRolledInTurn`] = 0; // Reset for next turn
                        landedSpaceId = newPosition;
                    } else {
                        newPosition = (playerStateTX.position + totalRoll) % txGameData.boardLayout.length;
                        updates[`players.${aiPlayerId}.position`] = newPosition;
                        landedSpaceId = newPosition;
                        const landedSpace = txGameData.boardLayout[newPosition];
                        messages.push(`${playerStateTX.name} (AI) rolled ${totalRoll} (${die1}, ${die2})${isDoubles ? " (Doubles!)" : ""}. Moved to ${landedSpace.name}.`);

                        let passedGo = false;
                        if (playerStateTX.position + totalRoll >= txGameData.boardLayout.length &&
                            !(isDoubles && currentDoublesCount === 3) &&
                            !playerStateTX.inDetention) {
                            passedGo = true;
                        }

                        if (passedGo) {
                            updates[`players.${aiPlayerId}.money`] = (playerStateTX.money || 0) + GO_BONUS;
                            updates.ukGovMoney = (txGameData.ukGovMoney || 0) - GO_BONUS;
                            updates[`players.${aiPlayerId}.govReceived`] = (playerStateTX.govReceived || 0) + GO_BONUS;
                            messages.push(`${playerStateTX.name} (AI) passed Dole and collected £${GO_BONUS}.`);

                            // Play token specific sound
                            playTokenSoundForPlayer(playerStateTX);
                        }

                        if (landedSpace.type === 'go_to_detention') {
                            newPosition = detentionCenterSpaceId;
                            updates[`players.${aiPlayerId}.position`] = newPosition;
                            updates[`players.${aiPlayerId}.inDetention`] = true;
                            updates[`players.${aiPlayerId}.missedTurnsInDetention`] = 0;
                            updates[`players.${aiPlayerId}.attemptedDetentionRollThisStay`] = false;
                            messages.push(`${playerStateTX.name} (AI) was sent to Detention!`);
                            isDoubles = false;
                            currentDoublesCount = 0;
                            updates[`players.${aiPlayerId}.doublesRolledInTurn`] = 0;
                            updates[`players.${aiPlayerId}.playerActionTakenThisTurn`] = true;
                            landedSpaceId = newPosition;
                            updates.detentionTransactionId = Date.now();
                        } else if (landedSpace.type === 'property' || landedSpace.type === 'set_property') {
                            const propEntry = txGameData.propertyData.find(p => p.id === landedSpace.id);
                            if (propEntry) {
                                const ownerBankrupt = propEntry.owner && txGameData.players[propEntry.owner]?.isBankrupt;
                                if (propEntry.owner && propEntry.owner !== aiPlayerId && !ownerBankrupt) {
                                    rentPaymentRequired = true;
                                    rentPayerId = aiPlayerId;
                                    rentPropertyId = landedSpace.id;
                                    messages.push(`${playerStateTX.name} (AI) landed on ${landedSpace.name}, owned by ${txGameData.players[propEntry.owner]?.name}. Rent due.`);
                                } else if (!propEntry.owner || ownerBankrupt) {
                                    const price = landedSpace.price;
                                    const aiMoney = updates[`players.${aiPlayerId}.money`] !== undefined ? updates[`players.${aiPlayerId}.money`] : playerStateTX.money;
                                    if (shouldAIBuyProperty(playerStateTX, landedSpace, txGameData, aiMoney)) {
                                        if (aiMoney >= price) {
                                            updates[`players.${aiPlayerId}.money`] = aiMoney - price;
                                            updates.bankMoney = (txGameData.bankMoney || 0) + price;
                                            let updatedPropertyDataArray = txGameData.propertyData.map(pr => {
                                                if (pr.id === landedSpace.id) {
                                                    return { ...pr, owner: aiPlayerId, tenancies: 0, permanentResidence: false };
                                                }
                                                return pr;
                                            });

                                            let transferOwnerId = null;
                                            let captureInfo = null;
                                            if (AUTO_TRANSFER_GROUPS.includes(landedSpace.groupId)) {
                                                logEvent(`AI BuyProp: Checking property set logic for ${landedSpace.name} (${landedSpace.groupId})`);

                                                const groupPropIds = txGameData.boardLayout
                                                    .filter(s => s.groupId === landedSpace.groupId && s.type === 'property')
                                                    .map(s => s.id);
                                                logEvent(`AI BuyProp: Group properties: ${JSON.stringify(groupPropIds)}`);

                                                const ownerMap = {};
                                                groupPropIds.forEach(id => {
                                                    const prop = updatedPropertyDataArray.find(p => p.id === id);
                                                    if (prop && prop.owner && prop.owner !== aiPlayerId) {
                                                        ownerMap[id] = prop.owner;
                                                        logEvent(`AI BuyProp: Found other owner ${txGameData.players[prop.owner]?.name} for property ${id}`);
                                                    }
                                                });

                                                const ownerCounts = {};
                                                Object.values(ownerMap).forEach(oid => {
                                                    ownerCounts[oid] = (ownerCounts[oid] || 0) + 1;
                                                });
                                                logEvent(`AI BuyProp: Owner counts: ${JSON.stringify(ownerCounts)}`);

                                                for (const [oid, count] of Object.entries(ownerCounts)) {
                                                    if (count === 2) {
                                                        transferOwnerId = oid;
                                                        logEvent(`AI BuyProp: Found transfer owner ${txGameData.players[oid]?.name} with 2 properties`);
                                                        break;
                                                    }
                                                }

                                                if (!transferOwnerId) {
                                                    logEvent(`AI BuyProp: No transfer owner found, checking for capture`);
                                                    const currentPlayerProps = groupPropIds.filter(pid => {
                                                        const prop = updatedPropertyDataArray.find(p => p.id === pid);
                                                        return prop && prop.owner === aiPlayerId;
                                                    });
                                                    logEvent(`AI BuyProp: AI owns ${currentPlayerProps.length} properties in group`);

                                                    if (currentPlayerProps.length === 2) {
                                                        const remainingPropId = groupPropIds.find(pid => {
                                                            const prop = updatedPropertyDataArray.find(p => p.id === pid);
                                                            return prop && prop.owner && prop.owner !== aiPlayerId;
                                                        });
                                                        if (remainingPropId) {
                                                            const remainingProp = updatedPropertyDataArray.find(p => p.id === remainingPropId);
                                                            captureInfo = { propId: remainingPropId, fromOwner: remainingProp.owner };
                                                            logEvent(`AI BuyProp: Can capture property ${remainingPropId} from ${txGameData.players[remainingProp.owner]?.name}`);
                                                        }
                                                    }
                                                }

                                                if (transferOwnerId) {
                                                    logEvent(`AI BuyProp: Executing transfer to ${txGameData.players[transferOwnerId]?.name}`);
                                                    updatedPropertyDataArray = updatedPropertyDataArray.map(p => {
                                                        if (p.id === landedSpace.id) return { ...p, owner: transferOwnerId };
                                                        return p;
                                                    });
                                                } else if (captureInfo) {
                                                    logEvent(`AI BuyProp: Executing capture of property ${captureInfo.propId}`);
                                                    updatedPropertyDataArray = updatedPropertyDataArray.map(p => {
                                                        if (p.id === captureInfo.propId) return { ...p, owner: aiPlayerId };
                                                        return p;
                                                    });
                                                } else {
                                                    logEvent(`AI BuyProp: No transfer or capture needed`);
                                                }
                                            }

                                            updates.propertyData = updatedPropertyDataArray;

                                            if (transferOwnerId) {
                                                const transferState = txGameData.players[transferOwnerId];
                                                updates[`players.${aiPlayerId}.propertiesOwned`] = playerStateTX.propertiesOwned || [];
                                                updates[`players.${transferOwnerId}.propertiesOwned`] = [ ...(transferState.propertiesOwned || []), landedSpace.id ];
                                                messages.push(`${playerStateTX.name} (AI) bought ${landedSpace.name} for £${price}, but it automatically transferred to ${transferState.name}.`);
                                            } else if (captureInfo) {
                                                const fromState = txGameData.players[captureInfo.fromOwner];
                                                updates[`players.${aiPlayerId}.propertiesOwned`] = [ ...(playerStateTX.propertiesOwned || []), landedSpace.id, captureInfo.propId ];
                                                updates[`players.${captureInfo.fromOwner}.propertiesOwned`] = (fromState.propertiesOwned || []).filter(pid => pid !== captureInfo.propId);
                                                const takenPropName = txGameData.boardLayout[captureInfo.propId]?.name || 'a property';
                                                messages.push(`${playerStateTX.name} (AI) bought ${landedSpace.name} for £${price} and took ${takenPropName} from ${fromState.name}.`);
                                            } else {
                                                updates[`players.${aiPlayerId}.propertiesOwned`] = [ ...(playerStateTX.propertiesOwned || []), landedSpace.id ];
                                                messages.push(`${playerStateTX.name} (AI) bought ${landedSpace.name} for £${price}.`);
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        updates[`players.${aiPlayerId}.playerActionTakenThisTurn`] = !isDoubles || currentDoublesCount >= 3;
                    }
                    updates.lastDiceRoll = { die1, die2, total: totalRoll, isDoubles, playerId: aiPlayerId, rollId: rollId };
                    updates.lastActionMessage = messages.join(" ");
                    updates.updatedAt = serverTimestamp();
                    transaction.update(gameDocRef, updates);
                    updatedDoublesCount = currentDoublesCount; // capture final count for logic after TX
                    // ---- END of example TX logic ----
                }); // End of Firestore Transaction

                // Post-transaction: Pay rent if needed (outside transaction)
                if (rentPaymentRequired && rentPayerId && rentPropertyId !== undefined) {
                    try {
                        const rentSnap = await getDoc(gameDocRef);
                        if (rentSnap.exists()) {
                            const rentGameData = rentSnap.data();
                            const payerState = rentGameData.players[rentPayerId];
                            const propLayout = rentGameData.boardLayout.find(s => s.id === rentPropertyId);
                            const propData = rentGameData.propertyData.find(p => p.id === rentPropertyId);
                            if (payerState && propLayout && propData) {
                                await payRent(payerState, propData, propLayout, rentGameData);
                            }
                        }
                    } catch (rentErr) {
                        logEvent(`AI ${aiPlayerId} rent payment failed: ${rentErr.message}`);
                    }
                }

                // Post-transaction: AI Development Logic (if applicable after moving)
                const postMoveSnapshot = await getDoc(gameDocRef);
                if (postMoveSnapshot.exists()) {
                    const postMoveGameData = postMoveSnapshot.data();
                    postMoveAIState = postMoveGameData.players[aiPlayerId];
                    if (postMoveAIState && !postMoveAIState.isBankrupt && !postMoveAIState.inDetention && (postMoveGameData.settings?.aiDevelopAfterMoving ?? true)) {
                        await processAIDevelopment(postMoveGameData, aiPlayerId, gameDocRef);
                    }
                }


                // Post-transaction: Draw card if on card space (delayed slightly)
                // This needs to be robust; if card draw leads to an action that ends the turn (e.g., go to jail),
                // the subsequent end-of-turn check must correctly evaluate.
                const cardDrawCheckSnapshot = await getDoc(gameDocRef); // Get latest state before card draw decision
                if (cardDrawCheckSnapshot.exists()) {
                    const cardDrawCheckGameData = cardDrawCheckSnapshot.data();
                    const stateBeforeCardDraw = cardDrawCheckGameData.players[aiPlayerId];
                    const spaceLandedOn = cardDrawCheckGameData.boardLayout[stateBeforeCardDraw.position]; // Use current position

                    // Only draw if not sent to jail by roll itself and still AI's turn and on a card space
                    if (stateBeforeCardDraw && !stateBeforeCardDraw.inDetention && cardDrawCheckGameData.playerOrder[cardDrawCheckGameData.currentPlayerIndex] === aiPlayerId) {
                        if (spaceLandedOn && (spaceLandedOn.type === 'opportunity' || spaceLandedOn.type === 'welfare')) {
                            logEvent(`AI ${aiPlayerId} landed on ${spaceLandedOn.name}. Queueing card draw.`);
                            setTimeout(async () => {
                                try {
                                    // Refetch gameData to ensure card indices are fresh and player is still eligible
                                    const freshCardSnap = await getDoc(gameDocRef);
                                    if (freshCardSnap.exists()) {
                                        const freshCardGameData = freshCardSnap.data();
                                        const freshAIStateForCard = freshCardGameData.players[aiPlayerId];
                                        const currentLandedSpace = freshCardGameData.boardLayout[freshAIStateForCard.position];

                                        if (freshAIStateForCard && !freshAIStateForCard.isBankrupt && !freshAIStateForCard.inDetention &&
                                            freshCardGameData.playerOrder[freshCardGameData.currentPlayerIndex] === aiPlayerId &&
                                            currentLandedSpace && currentLandedSpace.id === spaceLandedOn.id) { // Still on the same card space

                                            if (currentLandedSpace.type === 'opportunity') {
                                                await drawAndShowOpportunityCard(aiPlayerId);
                                            } else if (currentLandedSpace.type === 'welfare') {
                                                await drawAndShowWelfareCard(aiPlayerId);
                                            }
                                        } else {
                                            logEvent(`AI ${aiPlayerId} card draw skipped: state changed before card draw execution.`);
                                        }
                                    }
                                } catch (cardError) {
                                    logEvent(`AI ${aiPlayerId} card draw failed: ${cardError.message}`, cardError);
                                }
                                // The applyCardAction will update Firestore, which then triggers onSnapshot.
                                // The end-of-turn logic below will run AFTER this timeout completes (or earlier if an error occurs).
                            }, 700); // Delay for card draw
                        }
                    }
                }
            } catch (rollError) { // Catches errors from TX, rent, or card draw initiation
                logEvent(`AI ${aiPlayerId} roll processing phase failed: ${rollError.message}`, rollError);
                // Ensure lock is released
                if (window._aiTurnInProgress) {
                    window._aiTurnInProgress = false;
                    logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} after roll processing error.`);
                }
                // Attempt to end turn as a fallback if a major error occurred
                try { await handleEndTurnAction(); } catch(e) { /* ignore */ }
                return; // Stop further processing in handleAITurn
            }
        } catch (moveError) { // Catches errors from initial animation/sound or overall dice roll processing phase
            logEvent(`AI ${aiPlayerId} move/animation or subsequent action failed: ${moveError.message}`, moveError);
            if (window._aiTurnInProgress) {
                window._aiTurnInProgress = false;
                logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} after moveError in main roll phase.`);
            }
            try { await handleEndTurnAction(); } catch(e) { /* ignore */ }
            return; // Stop further processing
        }

        // Release AI lock early if a re-roll is warranted (doubles and under 3, still AI's turn)
        const needsImmediateReroll = isDoubles && updatedDoublesCount < 3 && postMoveAIState && !postMoveAIState.inDetention && !postMoveAIState.isBankrupt;
        if (needsImmediateReroll && window._aiTurnInProgress) {
            window._aiTurnInProgress = false;
            logEvent(`AI ${aiPlayerId} rolled doubles - lock released early for re-roll.`);
        }

        // --- Integrated end-of-turn/re-roll decision (replaces the previous 1300ms setTimeout) ---
        // This section runs after the main actions for the roll (move, buy, rent, card draw *initiation*) are done.
        // Card draw *effects* might still be pending via their own async/onSnapshot updates.
        const decisionDelay = 1000; // Delay to allow card draw effects to potentially update Firestore
        logEvent(`AI ${aiPlayerId}: Delaying end-of-turn/re-roll decision by ${decisionDelay}ms to allow post-roll actions (like card effects) to commit.`);

        setTimeout(async () => {
            try {
                const freshGameSnapshot = await getDoc(gameDocRef);
                if (freshGameSnapshot.exists()) {
                    const freshGameData = freshGameSnapshot.data();
                    const playerState = freshGameData.players[aiPlayerId]; // Current state of AI

                    if (!playerState) {
                        logEvent(`AI ${aiPlayerId} turn end processing: Player state missing.`);
                        if (window._aiTurnInProgress) {
                            window._aiTurnInProgress = false;
                            logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (player state missing in end processing).`);
                        }
                    } else if (playerState.isBankrupt) { // Check bankruptcy first
                        logEvent(`AI ${aiPlayerId} is bankrupt. Ending turn.`);
                         if (!playerState.playerActionTakenThisTurn) { // Mark action if somehow not set
                            await updateDoc(gameDocRef, { [`players.${aiPlayerId}.playerActionTakenThisTurn`]: true, updatedAt: serverTimestamp() });
                        }
                        await handleEndTurnAction();
                        if (window._aiTurnInProgress) {
                            window._aiTurnInProgress = false;
                            logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (bankrupt in end processing).`);
                        }
                    } else if (freshGameData.playerOrder[freshGameData.currentPlayerIndex] !== aiPlayerId) {
                        // Turn has already been changed by some other process (e.g. card effect that ends turn immediately)
                        logEvent(`AI ${aiPlayerId} turn end processing: Turn already advanced to another player (${freshGameData.playerOrder[freshGameData.currentPlayerIndex]}). Lock release expected by subscribeToGameState.`);
                        if (window._aiTurnInProgress) {
                             window._aiTurnInProgress = false; // Safety release
                             logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (turn advanced externally).`);
                        }
                    } else if (playerState.playerActionTakenThisTurn || playerState.inDetention) {
                        // Turn should genuinely end if action is marked or they are (back) in detention
                        logEvent(`Host ending turn for AI ${aiPlayerId}. ActionTaken: ${playerState.playerActionTakenThisTurn}, InDetention: ${playerState.inDetention}, Doubles: ${playerState.doublesRolledInTurn}`);
                        await handleEndTurnAction();
                        if (window._aiTurnInProgress) {
                            window._aiTurnInProgress = false;
                            logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} after calling handleEndTurnAction.`);
                        }
                    } else if (playerState.doublesRolledInTurn > 0 && playerState.doublesRolledInTurn < 3 && !playerState.inDetention && !playerState.isBankrupt) {
                        // AI rolled doubles and should roll again. Release the lock and proactively
                        // schedule the next roll in case no further Firestore update occurs to
                        // trigger subscribeToGameState.
                        logEvent(`AI ${aiPlayerId} turn not ended: Doubles rolled (count: ${playerState.doublesRolledInTurn}), AI will roll again.`);
                        window._aiTurnInProgress = false;
                        setTimeout(async () => {
                            try {
                                const freshSnapshot = await getDoc(gameDocRef);
                                if (freshSnapshot.exists()) {
                                    const freshData = freshSnapshot.data();
                                    if (freshData.playerOrder[freshData.currentPlayerIndex] === aiPlayerId &&
                                        !freshData.players[aiPlayerId]?.isBankrupt &&
                                        !freshData.players[aiPlayerId]?.inDetention) {
                                        window._aiTurnInProgress = true;
                                        await handleAITurn(freshData, aiPlayerId);
                                    }
                                }
                            } catch (rerollErr) {
                                logEvent(`AI ${aiPlayerId} reroll trigger failed: ${rerollErr.message}`);
                            }
                        }, 300);
                        return;
                    } else {
                        // Fallback: If it's still AI's turn, but no other condition met, end it.
                        logEvent(`AI ${aiPlayerId} turn end processing: Fallback - still AI's turn but no clear next step. Ending turn. PlayerActionTaken: ${playerState.playerActionTakenThisTurn}, Doubles: ${playerState.doublesRolledInTurn}`);
                        if (!playerState.playerActionTakenThisTurn) { // Mark action if not set
                             await updateDoc(gameDocRef, { [`players.${aiPlayerId}.playerActionTakenThisTurn`]: true, updatedAt: serverTimestamp() });
                        }
                        await handleEndTurnAction();
                        if (window._aiTurnInProgress) {
                            window._aiTurnInProgress = false;
                            logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} in fallback end processing.`);
                        }
                    }
                } else {
                    logEvent(`AI ${aiPlayerId} turn end processing: Game document not found.`);
                    if (window._aiTurnInProgress) {
                        window._aiTurnInProgress = false;
                        logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} (game doc not found in end processing).`);
                    }
                }
            } catch (endError) {
                logEvent(`Error in AI ${aiPlayerId} delayed turn end processing: ${endError.message}`, endError);
                if (window._aiTurnInProgress) {
                    window._aiTurnInProgress = false;
                    logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} after error in delayed end processing.`);
                }
                // Attempt to end turn as a final fallback
                try { await handleEndTurnAction(); } catch(e) { /* ignore */ }
            }
        }, decisionDelay); // End of setTimeout for end-of-turn/re-roll decision

    } else { // This 'else' corresponds to 'if (!aiCurrentState.playerActionTakenThisTurn && !aiCurrentState.inDetention)'
        // This case is hit if, after detention processing and fetching fresh state, the AI player's
        // 'playerActionTakenThisTurn' is true, or they are 'inDetention' (and their detention action for the turn is complete).
        logEvent(`AI ${aiPlayerId} turn: Skipping main roll phase. playerActionTaken=${aiCurrentState.playerActionTakenThisTurn}, inDetention=${aiCurrentState.inDetention}. Proceeding to end turn.`);
        try {
             await handleEndTurnAction();
        } catch (e) {
            logEvent(`Error ending AI turn in fallback (action taken/in detention) else block: ${e.message}`);
        }
        if (window._aiTurnInProgress) {
            window._aiTurnInProgress = false;
            logEvent(`AI Turn: Lock RELEASED for ${aiPlayerId} in fallback (action taken/in detention) else block.`);
        }
    }
}

// You might also need a helper for AI development if it's complex:
async function processAIDevelopment(gameData, aiPlayerId, gameDocRef) {
    logEvent(`AI ${aiPlayerId} processing development opportunities.`);
    const aiPlayerState = gameData.players[aiPlayerId];
    if (!aiPlayerState || aiPlayerState.isBankrupt || aiPlayerState.inDetention) return;

    // Modified parameters for more aggressive development
    const SAFE_MONEY_BUFFER = gameData.settings?.aiSafeMoneyBuffer ?? 500; // Reduced from 700
    const RENT_BUFFER_MULTIPLIER = gameData.settings?.aiRentBufferMultiplier ?? 2; // Reduced from 3
    const MAX_DEVELOPMENT_PERCENTAGE = gameData.settings?.aiMaxDevPercentage ?? 0.8; // Increased from 0.6
    const MAX_DEVELOPMENTS_PER_ROUND = gameData.settings?.aiMaxDevsPerRound ?? 8; // Increased from 6
    let developmentsThisTurn = 5; // Increased from 3

    // Calculate highest potential rent the AI might need to pay (from your existing logic)
    let highestPotentialRent = 0;
    gameData.boardLayout.forEach(space => {
        if ((space.type === 'property' || space.type === 'set_property') && space.rent && space.rent.length > 0) {
            const maxRentOnSpace = Array.isArray(space.rent) ? Math.max(...space.rent) : space.rent[space.rent.length-1] || 0;
            if (maxRentOnSpace > highestPotentialRent) highestPotentialRent = maxRentOnSpace;
        }
    });
    
    const minSafeMoney = Math.max(SAFE_MONEY_BUFFER, highestPotentialRent * RENT_BUFFER_MULTIPLIER);
    const availableMoneyForDev = aiPlayerState.money - minSafeMoney;
    let developmentBudget = Math.max(0, availableMoneyForDev * MAX_DEVELOPMENT_PERCENTAGE);
    logEvent(`AI ${aiPlayerId} Dev Budget: £${developmentBudget.toFixed(0)} (Money: £${aiPlayerState.money}, Safe Buffer Req: £${minSafeMoney})`);

    if (developmentBudget <= 0) {
        logEvent(`AI ${aiPlayerId}: No budget for development.`);
        return;
    }

    const candidateDevelopments = [];
    const aiProperties = aiPlayerState.propertiesOwned || [];

    const calcRentForState = (layout, tenancies, hasPR) => {
        let index = hasPR ? MAX_TENANCIES_BEFORE_PR + 1 : tenancies;
        index = Math.min(index, layout.rent.length - 1);
        return layout.rent[index] || 0;
    };

    aiProperties.forEach(propId => {
        const propLayout = gameData.boardLayout.find(s => s.id === propId);
        const propData = gameData.propertyData.find(p => p.id === propId);
        if (!propLayout || !propData || propLayout.type !== 'property') return;

        // Check ownership of entire color group
        const groupProperties = gameData.boardLayout.filter(s => s.type === 'property' && s.groupId === propLayout.groupId);
        const ownsGroup = groupProperties.every(gp => {
            const pd = gameData.propertyData.find(p => p.id === gp.id);
            return pd && pd.owner === aiPlayerId;
        });
        if (!ownsGroup) return;

        const houseCost = propLayout.houseCost || 50;

        // Tenancy development
        if (!propData.permanentResidence && propData.tenancies < MAX_TENANCIES_BEFORE_PR) {
            const currentRent = calcRentForState(propLayout, propData.tenancies, false);
            const nextRent = calcRentForState(propLayout, propData.tenancies + 1, false);
            const roi = (nextRent - currentRent) / houseCost;
            candidateDevelopments.push({ propertyId: propId, type: 'tenancy', cost: houseCost, roi });
        }

        // Permanent Residence development
        if (PR_IS_FIFTH_DEVELOPMENT && !propData.permanentResidence && propData.tenancies === MAX_TENANCIES_BEFORE_PR) {
            const currentRent = calcRentForState(propLayout, propData.tenancies, false);
            const nextRent = calcRentForState(propLayout, propData.tenancies, true);
            const roi = (nextRent - currentRent) / houseCost;
            candidateDevelopments.push({ propertyId: propId, type: 'pr', cost: houseCost, roi });
        }
    });

    candidateDevelopments.sort((a, b) => b.roi - a.roi);

    let updates = {};
    let messages = [];
    let developmentsMadeCount = 0;

    const updatedPropertyData = gameData.propertyData.map(p => ({ ...p }));
    let totalSpent = 0;

    for (const dev of candidateDevelopments) {
        if (developmentsMadeCount >= MAX_DEVELOPMENTS_PER_ROUND) break;
        const propLayout = gameData.boardLayout.find(s => s.id === dev.propertyId);
        const dataIndex = updatedPropertyData.findIndex(p => p.id === dev.propertyId);
        if (!propLayout || dataIndex === -1) continue;

        const houseCost = propLayout.houseCost || 50;
        if (developmentBudget < houseCost) continue;
        if (aiPlayerState.money - totalSpent - houseCost < minSafeMoney) continue;

        if (dev.type === 'tenancy') {
            updatedPropertyData[dataIndex].tenancies += 1;
            messages.push(`${aiPlayerState.name} (AI) added a tenancy to ${propLayout.name}.`);
        } else if (dev.type === 'pr') {
            updatedPropertyData[dataIndex].permanentResidence = true;
            messages.push(`${aiPlayerState.name} (AI) built Permanent Residence on ${propLayout.name}.`);
        }

        developmentBudget -= houseCost;
        totalSpent += houseCost;
        developmentsMadeCount += 1;
    }

    if (developmentsMadeCount > 0) {
        updates[`players.${aiPlayerId}.money`] = aiPlayerState.money - totalSpent;
        updates.propertyData = updatedPropertyData;
        updates.bankMoney = (gameData.bankMoney || 0) + totalSpent;
        updates.lastActionMessage = messages.join(' ');
        updates.updatedAt = serverTimestamp();
        logEvent(`AI ${aiPlayerId} making ${developmentsMadeCount} developments. Updates:`, updates);
        await updateDoc(gameDocRef, updates);
        await new Promise(resolve => setTimeout(resolve, 700));
    }
}


// --- Property Swap Logic (No Modals Version) ---
let lastTapTime = 0;
let lastTappedElementId = null;
const DOUBLE_TAP_THRESHOLD = 300; // Milliseconds

function handlePropertyCardClick(space, spaceDiv, gameData) {
    const currentTime = new Date().getTime();
    const tappedElementId = spaceDiv.id;

    if (lastTappedElementId === tappedElementId && (currentTime - lastTapTime) < DOUBLE_TAP_THRESHOLD) {
        // Double tap detected
        handlePropertyCardDoubleClick(space, spaceDiv, gameData);
        // Reset tap tracking
        lastTapTime = 0;
        lastTappedElementId = null;
    } else {
        // Single tap or first tap
        lastTapTime = currentTime;
        lastTappedElementId = tappedElementId;
        // Original single-click logic (if any) can go here.
        // For now, it's mostly for initiating the double-tap sequence.
        // logEvent(`Single-clicked property: ${space.name} (ID: ${space.id}) by ${currentUserId}`);
    }
}

// --- Patch handlePropertyCardDoubleClick to use Firestore for swap state ---
async function handlePropertyCardDoubleClick(space, spaceDivElement, gameData) {
    if (!gameData || !gameData.players || !gameData.propertyData) {
        logEvent("Property swap (dblclick): gameData incomplete.");
        return;
    }
    const currentPlayerId = currentUserId;
    const currentPlayerState = gameData.players[currentPlayerId];
    const gameDocRef = doc(db, "games", currentGameId);
    const swapState = gameData.currentSwapProposal || {};
    // Only allow one active proposal at a time
    if (swapState.swapActive) return;
    if (!currentPlayerState || currentPlayerState.isBankrupt || gameData.status !== 'active' || gameData.preGamePhase) {
        logEvent("Property swap (dblclick): Not allowed due to player/game state.");
        return;
    }
    if (!space || (space.type !== 'property' && space.type !== 'set_property')) {
        logEvent("Property swap (dblclick): Clicked space is not a property.");
        return;
    }
    const clickedPropData = gameData.propertyData.find(p => p.id === space.id);
    if (!clickedPropData) {
        logEvent("Property swap (dblclick): Property data not found.");
        return;
    }
    if (clickedPropData.owner !== currentPlayerId && (currentPlayerState.stealCards || 0) > 0 && !swapState.cardA) {
        await performStealProperty(space.id, clickedPropData.owner, currentPlayerId, gameData);
        return;
    }
    // Step 1: Select own property
    if (clickedPropData.owner === currentPlayerId) {
        await updateDoc(gameDocRef, {
            currentSwapProposal: {
                cardA: { playerId: currentPlayerId, propId: space.id },
                cardB: null,
                swapInitiatorPlayerId: currentPlayerId,
                swapActive: false,
                swapTimeoutSetAt: Date.now(),
            },
            flashingProperties: [space.id],
            lastActionMessage: `${currentPlayerState.name} is considering a property swap...`,
            updatedAt: serverTimestamp(),
        });
        return;
    }
    // Step 2: Propose swap with another player's property
    if (swapState.cardA && swapState.swapInitiatorPlayerId === currentPlayerId && clickedPropData.owner !== null && clickedPropData.owner !== currentPlayerId) {
        const targetPlayerId = clickedPropData.owner;
        const targetPlayerState = gameData.players[targetPlayerId];
        if (!targetPlayerState || targetPlayerState.isBankrupt) {
            await clearSwapProposalInFirestore(gameDocRef);
            return;
        }
        await updateDoc(gameDocRef, {
            currentSwapProposal: {
                cardA: swapState.cardA,
                cardB: { playerId: targetPlayerId, propId: space.id },
                swapInitiatorPlayerId: currentPlayerId,
                swapActive: true,
                swapTimeoutSetAt: Date.now(),
            },
            flashingProperties: [swapState.cardA.propId, space.id],
            lastActionMessage: `${currentPlayerState.name} proposed to swap "${gameData.boardLayout.find(s => s.id === swapState.cardA.propId)?.name || "a property"}" with ${targetPlayerState.name}'s "${space.name || "a property"}". Click a flashing card to proceed.`,
            updatedAt: serverTimestamp(),
        });
        return;
    }
    // Deselect/cancel
    if (swapState.cardA && swapState.cardA.propId === space.id && !swapState.cardB) {
        await clearSwapProposalInFirestore(gameDocRef);
        return;
    }
    // Invalid
    logEvent("Swap Info (dblclick): Invalid swap double-click action.");
}

// --- Patch global click handler for swap acceptance/cancellation ---
document.addEventListener('click', async function(e) {
    const swapState = window._propertySwapState;
    if (!swapState || !swapState.swapActive || !swapState.cardA || !swapState.cardB) return;
    const clickedElement = e.target.closest('.space.property, .space.set-property');
    if (!clickedElement) return;
    const clickedPropId = parseInt(clickedElement.id.replace('space-', ''));
    const gameDocRef = doc(db, "games", currentGameId);
    const gameDataForClick = localGameData;
    const { cardA, cardB, swapInitiatorPlayerId } = swapState;
    if (!cardA || !cardB) {
        logEvent("Swap Click: CardA or CardB is null, aborting interaction logic.");
        window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
        await updateDoc(gameDocRef, { flashingProperties: [], lastActionMessage: "Swap cancelled due to incomplete state.", updatedAt: serverTimestamp() });
        return;
    }
    const initiatorPlayerId = cardA.playerId;
    const targetPlayerId = cardB.playerId;
    let actionTaken = false;
    let cancelled = false;
    if (clickedPropId === cardA.propId) {
        if (currentUserId === initiatorPlayerId) {
            logEvent(`Swap CANCELLED by initiator ${initiatorPlayerId} (P1) re-clicking their own card (${cardA.propId}).`);
            await updateDoc(gameDocRef, {
                currentSwapProposal: null,
                flashingProperties: [],
                lastActionMessage: `${gameDataForClick.players[initiatorPlayerId]?.name || 'Initiator'} cancelled the swap.`,
                updatedAt: serverTimestamp()
            });
            actionTaken = true;
            cancelled = true;
        } else if (currentUserId === targetPlayerId) {
            logEvent(`Swap CONFIRMED by target ${targetPlayerId} (P2) clicking initiator's card (${cardA.propId}). Performing swap.`);
            await performPropertySwap(cardA, cardB, gameDataForClick);
            actionTaken = true;
        }
    } else if (clickedPropId === cardB.propId) {
        if (currentUserId === initiatorPlayerId) {
            logEvent(`Swap CONFIRMED by initiator ${initiatorPlayerId} (P1) re-clicking target's card (${cardB.propId}). Performing swap.`);
            await performPropertySwap(cardA, cardB, gameDataForClick);
            actionTaken = true;
        } else if (currentUserId === targetPlayerId) {
            logEvent(`Swap CANCELLED by target ${targetPlayerId} (P2) clicking their own card (${cardB.propId}).`);
            await updateDoc(gameDocRef, {
                currentSwapProposal: null,
                flashingProperties: [],
                lastActionMessage: `${gameDataForClick.players[targetPlayerId]?.name || 'Target player'} declined the swap.`,
                updatedAt: serverTimestamp()
            });
            actionTaken = true;
            cancelled = true;
        }
    }
    if (actionTaken) {
        if (window._propertySwapState.swapTimeout) {
            clearTimeout(window._propertySwapState.swapTimeout);
        }
        window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
    } else {
        logEvent(`Swap Click Ignored: Click by ${currentUserId} on ${clickedPropId} did not match confirm/cancel conditions for involved players.`);
    }
}, false);

async function performPropertySwap(instigatorCardInfo, targetCardInfo, gameDataSnapshot) {
    // Check if swap is still valid in Firestore before proceeding
    // Use a unique variable name for the fresh doc ref
    const freshGameDocRef = doc(db, 'games', currentGameId);
    const freshGameDoc = await getDoc(freshGameDocRef);
    if (!freshGameDoc.exists()) {
        logEvent("performPropertySwap: Game doc not found, aborting swap.");
        return;
    }
    const freshGameData = freshGameDoc.data();
    if (!freshGameData.currentSwapProposal || !freshGameData.currentSwapProposal.swapActive) {
        logEvent("performPropertySwap: Swap proposal no longer active, aborting swap.");
        return;
    }
    if (!instigatorCardInfo || !targetCardInfo) {
        logEvent("performPropertySwap: Missing instigator or target data.");
        return;
    }
    if (!currentGameId || !db) {
        logEvent("performPropertySwap: Missing gameId or db connection.");
        return;
    }
    const gameDocRef = doc(db, 'games', currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            const freshGameDoc = await transaction.get(gameDocRef);
            if (!freshGameDoc.exists()) throw new Error('Game not found for property swap.');
            const freshGameData = freshGameDoc.data();
            const instigatorPlayerId = instigatorCardInfo.playerId;
            const targetPlayerId = targetCardInfo.playerId;
            const instigatorPropId = instigatorCardInfo.propId;
            const targetPropId = targetCardInfo.propId;
            const propA_Layout = freshGameData.boardLayout.find(s => s.id === instigatorPropId);
            const propB_Layout = freshGameData.boardLayout.find(s => s.id === targetPropId);
            const propA_DataIndex = freshGameData.propertyData.findIndex(p => p.id === instigatorPropId);
            const propB_DataIndex = freshGameData.propertyData.findIndex(p => p.id === targetPropId);
            if (propA_DataIndex === -1 || propB_DataIndex === -1) {
                throw new Error('One or both properties not found. Swap cancelled.');
            }
            const propA_CurrentData = freshGameData.propertyData[propA_DataIndex];
            const propB_CurrentData = freshGameData.propertyData[propB_DataIndex];
            if (propA_CurrentData.owner !== instigatorPlayerId || propB_CurrentData.owner !== targetPlayerId) {
                throw new Error('Property ownership changed. Swap cancelled.');
            }
            const instigatorPlayer = freshGameData.players[instigatorPlayerId];
            const targetPlayer = freshGameData.players[targetPlayerId];
            if (!instigatorPlayer || instigatorPlayer.isBankrupt || !targetPlayer || targetPlayer.isBankrupt) {
                throw new Error('One or both players bankrupt/invalid. Swap cancelled.');
            }
            let updates = {};
            let updatedPropertyData = freshGameData.propertyData.map(p => ({ ...p }));
            updatedPropertyData[propA_DataIndex].owner = targetPlayerId;
            updatedPropertyData[propB_DataIndex].owner = instigatorPlayerId;
            updates.propertyData = updatedPropertyData;
            let instigatorProps = (instigatorPlayer.propertiesOwned || []).filter(id => id !== instigatorPropId);
            instigatorProps.push(targetPropId);
            updates[`players.${instigatorPlayerId}.propertiesOwned`] = instigatorProps;
            let targetProps = (targetPlayer.propertiesOwned || []).filter(id => id !== targetPropId);
            targetProps.push(instigatorPropId);
            updates[`players.${targetPlayerId}.propertiesOwned`] = targetProps;
            updates.lastActionMessage = `${instigatorPlayer.name} and ${targetPlayer.name} swapped ${propA_Layout?.name || 'property'} for ${propB_Layout?.name || 'property'}!`;
            updates.flashingProperties = [];
            updates.updatedAt = serverTimestamp();
            transaction.update(gameDocRef, updates);
            logEvent(`Property swap committed: ${instigatorPropId} (${instigatorPlayerId}) <-> ${targetPropId} (${targetPlayerId})`);
        });
    } catch (e) {
        console.error("Error during property swap transaction:", e);
        await updateDoc(gameDocRef, {
            flashingProperties: [],
            lastActionMessage: "Property swap failed: " + e.message,
            updatedAt: serverTimestamp()
        }).catch(err => console.error("Error clearing flashing props after failed swap tx:", err));
    } finally {
  window._propertySwapState = { cardA: null, cardB: null, swapInitiatorPlayerId: null, swapActive: false, swapTimeout: null };
  }
}

async function performStealProperty(propId, fromPlayerId, toPlayerId, gameDataSnapshot) {
    const gameDocRef = doc(db, 'games', currentGameId);
    try {
        await runTransaction(db, async (transaction) => {
            const freshDoc = await transaction.get(gameDocRef);
            if (!freshDoc.exists()) throw new Error('Game not found for steal.');
            const freshData = freshDoc.data();
            const thiefState = freshData.players[toPlayerId];
            const victimState = freshData.players[fromPlayerId];
            if (!thiefState || !victimState || thiefState.isBankrupt || victimState.isBankrupt) {
                throw new Error('Invalid player state.');
            }
            if ((thiefState.stealCards || 0) <= 0) {
                throw new Error('No Steal cards available.');
            }
            const propIndex = freshData.propertyData.findIndex(p => p.id === propId);
            if (propIndex === -1) throw new Error('Property not found.');
            if (freshData.propertyData[propIndex].owner !== fromPlayerId) {
                throw new Error('Ownership changed.');
            }

            const updatedPropertyData = freshData.propertyData.map(p => ({ ...p }));
            updatedPropertyData[propIndex].owner = toPlayerId;

            const newVictimProps = (victimState.propertiesOwned || []).filter(id => id !== propId);
            const newThiefProps = [...(thiefState.propertiesOwned || []), propId];

            let updates = {
                propertyData: updatedPropertyData,
            };
            updates[`players.${fromPlayerId}.propertiesOwned`] = newVictimProps;
            updates[`players.${toPlayerId}.propertiesOwned`] = newThiefProps;
            updates[`players.${toPlayerId}.stealCards`] = (thiefState.stealCards || 0) - 1;
            updates.lastActionMessage = `${thiefState.name} stole ${freshData.boardLayout[propId]?.name || 'a property'} from ${victimState.name}!`;
            updates.updatedAt = serverTimestamp();

            transaction.update(gameDocRef, updates);
        });
    } catch (e) {
        console.error('Error during steal transaction:', e);
        await updateDoc(gameDocRef, {
            lastActionMessage: 'Property steal failed: ' + e.message,
            updatedAt: serverTimestamp()
        });
    }
}

// NEW Function to play a ping sound for doubles
function playDoubleSound() {
    if (audioContextStarted && typeof Tone !== 'undefined') {
        try {
            // Create a simple synth for the ping if it doesn't exist or to ensure fresh sound
            const pingSynth = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: {
                    attack: 0.005,
                    decay: 0.1,
                    sustain: 0.05,
                    release: 0.2
                }
            }).toDestination();
            pingSynth.triggerAttackRelease("A5", "8n", Tone.now()); // A high-pitched note for ping
        } catch (e) {
            console.error("Double roll sound error:", e);
        }
    }
}

// --- Board Background Rotation ---
// The board background should rotate through sequential boat images
// (boat1.png, boat2.png, ...). We'll dynamically discover which boat
// images exist by attempting to load them in order until we encounter
// a missing file. Once the available list is built the rotation will
// begin.
const boardBackgrounds = [];
let currentBackgroundIndex = 0; // This will be aligned by startBoardBackgroundRotation
let backgroundIntervalId = null;

function loadBoatBackgrounds(startCallback) {
    let index = 1;

    const tryLoad = () => {
        const img = new Image();
        img.onload = () => {
            boardBackgrounds.push(`images/boat${index}.png`);
            index++;
            tryLoad();
        };
        img.onerror = () => {
            if (boardBackgrounds.length === 0) {
                console.warn("No boat images found for board background rotation.");
            }
            if (typeof startCallback === 'function') {
                startCallback();
            }
        };
        img.src = `images/boat${index}.png`;
    };

    tryLoad();
}

function changeBoardBackground() {
    const boardElement = document.getElementById('board-container');
    if (boardElement && boardBackgrounds.length > 0) {
        currentBackgroundIndex = (currentBackgroundIndex + 1) % boardBackgrounds.length;
        const nextBackground = boardBackgrounds[currentBackgroundIndex];
        boardElement.style.backgroundImage = `url('${nextBackground}')`;
        
        // Use existing logEvent if available, otherwise console.log
        if (typeof logEvent === 'function') {
            logEvent(`Board background changed to: ${nextBackground}`);
        } else {
            console.log(`Board background changed to: ${nextBackground}`);
        }
    } else {
        if (boardBackgrounds.length === 0) {
            console.warn("Board backgrounds array is empty. Stopping rotation.");
        } else if (!boardElement) {
            // It's possible the boardElement is not found if the game view is not active
            // or if this function is called at an unexpected time.
            console.warn("Board container element not found during background change. Rotation might be paused if board is not visible.");
        }
        // Stop the interval if critical conditions are no longer met (e.g., board not found, or array empty)
        if (backgroundIntervalId && (!boardElement || boardBackgrounds.length === 0)) {
            clearInterval(backgroundIntervalId);
            backgroundIntervalId = null;
            console.warn("Board background rotation stopped due to missing element or empty background list.");
        }
    }
}

function startBoardBackgroundRotation() {
    // Clear any existing interval to prevent multiple timers running
    if (backgroundIntervalId) {
        clearInterval(backgroundIntervalId);
        backgroundIntervalId = null;
    }

    const boardElement = document.getElementById('board-container');
    if (boardElement && boardBackgrounds.length > 0) {
        const currentBgStyle = window.getComputedStyle(boardElement).backgroundImage;
        let initialIndex = -1;

        // Try to find the currently set background in our list to align the rotation
        for (let i = 0; i < boardBackgrounds.length; i++) {
            // Check if the filename (e.g., "train.png") is part of the full URL string
            // The exact format of currentBgStyle can vary (e.g., with quotes or full path)
            if (currentBgStyle.includes(boardBackgrounds[i])) {
                initialIndex = i;
                break;
            }
        }

        if (initialIndex !== -1) {
            // If the current CSS background is found in the list, align the rotation
            currentBackgroundIndex = initialIndex;
            const logMsg = `Board background rotation aligned with current CSS. Initial: ${boardBackgrounds[currentBackgroundIndex]}. Next change in 30s.`;
            if (typeof logEvent === 'function') logEvent(logMsg); else console.log(logMsg);
        } else {
            // If not found (or CSS is different/empty), set the first image from our list and start from index 0
            // This also handles the case where no background image is initially set via CSS for the board.
            boardElement.style.backgroundImage = `url('${boardBackgrounds[0]}')`;
            currentBackgroundIndex = 0;
            const logMsg = `Initial board background set to: ${boardBackgrounds[0]}. Next change in 30s.`;
            if (typeof logEvent === 'function') logEvent(logMsg); else console.log(logMsg);
        }
        
        backgroundIntervalId = setInterval(changeBoardBackground, 50000); // Rotate every 30 seconds
    } else {
        if (boardBackgrounds.length === 0) {
            console.warn("Cannot start board background rotation: backgrounds array is empty.");
        } else if (!boardElement) {
            // This might happen if this function is called before the board is in the DOM.
            // The DOMContentLoaded listener should prevent this for the initial call.
            console.warn("Cannot start board background rotation: board-container element not found at time of call.");
        }
    }
}

// Add an event listener to start the rotation once the DOM is fully loaded.
// This ensures getElementById('board-container') and getComputedStyle will work as expected.
document.addEventListener('DOMContentLoaded', () => {
    // Build the list of available boat images first, then start rotation.
    // Rotation will only start if the board container is present.
    const boardExists = document.getElementById('board-container');
    if (boardExists) {
        loadBoatBackgrounds(startBoardBackgroundRotation);
    } else {
        console.warn("Board container not found on DOMContentLoaded. Background rotation might not start if board is added later without a manual restart call.");
    }
});

// Developer Note: 
// If your game dynamically creates/destroys the game board (e.g., in functions like `resetToSetupScreen` 
// or `setupBoardFromFirestore`), you should manage this interval:
// 1. Clear the interval when the board is destroyed or the game resets:
//    if (backgroundIntervalId) { 
//        clearInterval(backgroundIntervalId); 
//        backgroundIntervalId = null; 
//        if (typeof logEvent === 'function') logEvent("Board background rotation stopped."); else console.log("Board background rotation stopped.");
//    }
// 2. Restart the rotation when the board is created/game starts/UI is ready:
//    startBoardBackgroundRotation();
//
// This is important to prevent errors if the #board-container element is removed from the DOM
// and to ensure the rotation restarts correctly for new game sessions or UI refreshes.
// For instance, you might call `startBoardBackgroundRotation()` inside `setupBoardFromFirestore` 
// after `boardContainer.innerHTML = '';` and the board elements are re-added,
// or when transitioning from a setup screen to the active game view.


// NEW Function to trigger dice pulse effect
function triggerDicePulseEffect() {
    const diceDisplayContainer = document.getElementById('actual-dice-faces');
    if (diceDisplayContainer) {
        diceDisplayContainer.classList.add('dice-double-pulse');
        // Remove the class after the animation duration (e.g., 1 second)
        setTimeout(() => {
            diceDisplayContainer.classList.remove('dice-double-pulse');
        }, 1000); // Duration should match CSS animation
    }
}
