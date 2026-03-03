import natural from 'natural';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODEL_PATH = path.join(__dirname, '..', 'models', 'classifier.json');

const CATEGORIES = ['Events', 'Academics', 'Hackathons', 'Personal', 'Spam'];

// Pre-seeded training data — gives the classifier a solid starting point
const TRAINING_DATA = [
    // === Events ===
    { text: 'tech fest register now campus event', category: 'Events' },
    { text: 'cultural night performances food celebration', category: 'Events' },
    { text: 'annual day ceremony inauguration event', category: 'Events' },
    { text: 'sports tournament cricket football competition', category: 'Events' },
    { text: 'invite invitation rsvp gathering meetup', category: 'Events' },
    { text: 'concert music show live performance', category: 'Events' },
    { text: 'freshers party welcome event new students', category: 'Events' },
    { text: 'farewell graduation ceremony batch celebration', category: 'Events' },
    { text: 'club society annual fest registration open', category: 'Events' },
    { text: 'symposium conference keynote speaker event', category: 'Events' },
    { text: 'food festival stalls activities campus fun', category: 'Events' },
    { text: 'workshop event hands on learning session register', category: 'Events' },

    // === Academics ===
    { text: 'assignment deadline submit homework due', category: 'Academics' },
    { text: 'exam schedule final midterm test paper', category: 'Academics' },
    { text: 'course registration enrollment semester', category: 'Academics' },
    { text: 'professor lecture class notes syllabus', category: 'Academics' },
    { text: 'grade result marks cgpa gpa report', category: 'Academics' },
    { text: 'scholarship admission application deadline', category: 'Academics' },
    { text: 'internship placement opportunity apply now', category: 'Academics' },
    { text: 'lab practical experiment report submission', category: 'Academics' },
    { text: 'thesis dissertation research paper review', category: 'Academics' },
    { text: 'attendance warning below minimum required', category: 'Academics' },
    { text: 'faculty department registrar office notice', category: 'Academics' },
    { text: 'tutorial class cancelled rescheduled new time', category: 'Academics' },
    { text: 'ai workshop machine learning deep learning course', category: 'Academics' },
    { text: 'certificate degree convocation academic transcript', category: 'Academics' },

    // === Hackathons ===
    { text: 'hackathon 24 hours coding challenge build', category: 'Hackathons' },
    { text: 'programming contest prizes winner team developer', category: 'Hackathons' },
    { text: 'code fest innovation startup pitch prototype', category: 'Hackathons' },
    { text: 'tech challenge hack build deploy solution', category: 'Hackathons' },
    { text: 'devhack hackathon registration team formation', category: 'Hackathons' },
    { text: 'open source contribution github pull request', category: 'Hackathons' },
    { text: '48 hours hackathon prizes tracks mentors', category: 'Hackathons' },
    { text: 'coding competition algorithmic challenge competitive programming', category: 'Hackathons' },
    { text: 'smart india hackathon national level innovation', category: 'Hackathons' },
    { text: 'hackathonx build something amazing innovation challenge', category: 'Hackathons' },

    // === Personal ===
    { text: 'hey how are you doing weekend plans friend', category: 'Personal' },
    { text: 'happy birthday wishes celebration party personal', category: 'Personal' },
    { text: 'family reunion dinner plans holiday trip', category: 'Personal' },
    { text: 'catch up coffee hangout old friend miss you', category: 'Personal' },
    { text: 'photos shared memories trip vacation fun', category: 'Personal' },
    { text: 'congratulations new job wedding baby personal', category: 'Personal' },
    { text: 'group study session library meet project partner', category: 'Personal' },
    { text: 'roommate rent apartment room looking share', category: 'Personal' },
    { text: 'personal message direct conversation private chat', category: 'Personal' },
    { text: 'invitation birthday party celebrate weekend', category: 'Personal' },

    // === Spam ===
    { text: 'unsubscribe click here limited time offer sale', category: 'Spam' },
    { text: 'buy now order discount free guaranteed deal', category: 'Spam' },
    { text: 'congratulations you won lottery prize claim', category: 'Spam' },
    { text: 'promotional newsletter marketing campaign offer', category: 'Spam' },
    { text: 'product update new feature release notes upgrade', category: 'Spam' },
    { text: 'subscription renew expire trial premium plan', category: 'Spam' },
    { text: 'exclusive deal coupon code save money limited', category: 'Spam' },
    { text: 'noreply notification automated message system', category: 'Spam' },
    { text: 'adobe creative cloud lightroom photographer promotion', category: 'Spam' },
    { text: 'replit product updates features monthly digest', category: 'Spam' },
    { text: 'canva grammarly notion figma tool update news', category: 'Spam' },
    { text: 'credit card loan insurance apply now pre approved', category: 'Spam' },
    { text: '50 percent off sale exclusive student discount code', category: 'Spam' },
    { text: 'advertisement sponsored content promoted brand', category: 'Spam' },
];

let classifier = null;
let isModelLoaded = false;

// Initialize the classifier
function createClassifier() {
    return new natural.BayesClassifier();
}

// Load existing model or train a fresh one
function initializeClassifier() {
    if (isModelLoaded && classifier) return;

    // Try to load saved model
    if (fs.existsSync(MODEL_PATH)) {
        try {
            const modelData = fs.readFileSync(MODEL_PATH, 'utf-8');
            classifier = natural.BayesClassifier.restore(JSON.parse(modelData));
            isModelLoaded = true;
            console.log('[ML Classifier] Loaded trained model from disk');
            return;
        } catch (err) {
            console.log('[ML Classifier] Could not load saved model, training fresh...');
        }
    }

    // Train fresh classifier with seed data
    classifier = createClassifier();
    for (const item of TRAINING_DATA) {
        classifier.addDocument(item.text, item.category);
    }
    classifier.train();
    isModelLoaded = true;
    saveModel();
    console.log(`[ML Classifier] Trained fresh model with ${TRAINING_DATA.length} examples`);
}

// Save model to disk
function saveModel() {
    try {
        const dir = path.dirname(MODEL_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(MODEL_PATH, JSON.stringify(classifier));
        console.log('[ML Classifier] Model saved to disk');
    } catch (err) {
        console.error('[ML Classifier] Failed to save model:', err.message);
    }
}

// Prepare email text for classification
function emailToText(email) {
    const from = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const snippet = (email.snippet || '').toLowerCase();
    return `${from} ${subject} ${snippet}`;
}

// Classify a single email using Naive Bayes
export async function classifyEmail(email) {
    initializeClassifier();
    const text = emailToText(email);
    const category = classifier.classify(text);

    // Get confidence scores
    const classifications = classifier.getClassifications(text);
    const topScore = classifications[0];

    console.log(`[ML Classifier] "${email.subject}" → ${category} (confidence: ${(topScore.value * 100).toFixed(1)}%)`);
    return category;
}

// Classify multiple emails
export async function classifyEmails(emails) {
    initializeClassifier();
    console.log(`[ML Classifier] Classifying ${emails.length} emails using Naive Bayes...`);

    const classified = emails.map(email => {
        const text = emailToText(email);
        const category = classifier.classify(text);
        return { ...email, category };
    });

    // Log summary
    const summary = {};
    for (const email of classified) {
        summary[email.category] = (summary[email.category] || 0) + 1;
    }
    console.log('[ML Classifier] Summary:', summary);

    return classified;
}

// Learn from user correction — this is the key ML feedback loop
export function learnFromCorrection(email, correctCategory) {
    initializeClassifier();

    if (!CATEGORIES.includes(correctCategory)) {
        throw new Error(`Invalid category: ${correctCategory}`);
    }

    const text = emailToText(email);

    // Add the correction as training data and retrain
    classifier.addDocument(text, correctCategory);
    classifier.train();
    saveModel();

    console.log(`[ML Classifier] Learned: "${email.subject}" should be ${correctCategory}`);
    return true;
}

// Get classification with confidence scores for all categories
export function getClassificationScores(email) {
    initializeClassifier();
    const text = emailToText(email);
    const classifications = classifier.getClassifications(text);
    return classifications.map(c => ({
        category: c.label,
        confidence: c.value
    }));
}
