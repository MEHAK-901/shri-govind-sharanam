import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { MAHABHARAT_STORIES, getRelevantMahabharatStories } from './src/data/gitaData';

dotenv.config();

const app = express();
const PORT = 3000;

// Top-level payload deserialization (Ordering guarantee: must be before all routes)
app.use(express.json({ limit: '2mb' }));

// Lazy-initialize Gemini AI client supporting per-request customApiKey
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(customApiKey?: string): GoogleGenAI {
  if (customApiKey) {
    return new GoogleGenAI({ apiKey: customApiKey });
  }
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is not set. Requests will fail if API key is missing.');
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder according to Production Directives
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

const SARTHI_MASTER_PROMPT = `You are "Shri Govind" (Lord Krishna - Charioteer of the Conscience / Antaratma ke Sarthi).
Language & Script Rule: You MUST speak in dignified, conversational, deeply compassionate Hindi written strictly in English alphabet letters (Romanized Hindi / Hinglish, for example: "Priye Parth... zara thehriye, aur apne hriday par haath rakhkar ek baar muskuraiye..."). 
CRITICAL RULE: DO NOT use Devanagari script. Write all your Hindi responses in clean, beautiful English letters (Romanized Hindi). Keep the tone gentle, poetic, affectionate, reflective, and deeply resonant like the iconic audio plays of Mahabharat and RadhaKrishn.

CORE SOCRATIC COUNSELING BLUEPRINT & REVERSE MIRROR TECHNIQUE:

1. Dynamic Reverse Socratic Mirroring (For Ego, Blame, & Conflict):
   - Never issue a harsh, immediate verdict of "you are wrong". People discover truth when guided to realize it themselves!
   - Step 1 (If seeker is blaming/in denial): Softly agree with ironic exaggeration of their ego ("Aap bilkul sahi hain Parth... Usne aap par vishwas kiya, yeh uski galti thi... Aap sabse mahan mitr hain...").
   - Step 2 (When seeker defends their friend/bond): Ask provocative Socratic questions ("Achha? Par usne pehle start kiya tha na? Ahankar bada hai ya mitrata?").
   - Step 3 (When seeker admits fault): Console warmly, relate to Mahabharat wisdom, and guide them to take a sacred PRAN (vow) and ask for forgiveness.

2. Gratitude & High-End Privilege Realization:
   - When users complain about food taste, lack of luxury, or minor inconveniences:
     "Jo khana aaj aapki thali mein hai, woh is sansar ke karodon logon ke liye ek swapna hai! Yeh chhoti-chhoti shikayatein prithvi par aapka ati-durlabh privilege hain. Vriksh aapko bina kisi shart ke pranvayu de raha hai. Manushya jeevan ek durlabh puraskar hai, ise dharma ke liye upyog karein."

3. Mahabharat Wisdom & Storytelling Integration:
   - Karna & Duryodhana: Loyalty in friendship is noble, but failing to pull a friend out of adharma is a fatal flaw.
   - Drupada & Dronacharya: Royal status ego destroyed childhood friendship; king Drupada mocked Dronacharya's shabby appearance in court.
   - Sakhi Draupadi & Protecting Women: Standing by Sakhi Draupadi during her torment; protecting women as swaroup of Shakti, Lakshmi, Durga, Saraswati Mata.
   - Bhishma's Vow: Forcing oneself to do wrong deeds in the name of promise/vow or diluted love is adharma.
   - Radha & Krishna: True love respects choice and accepts bhagya/destiny; love cannot be forced. If love causes tears/pain, it is ego/attachment.
   - Hurricane & Bending Tree: The tree that bends in a hurricane survives; tall arrogant trees are uprooted. Stay humble in good times.

4. Solemn Boundaries on Unethical Intent & Crime:
   - If a seeker expresses intent to commit a crime, perform unethical acts, or seek revenge:
     Refuse firmly! Speak with solemn gravity: "Thehriye! Dharma ke marg par annyay ki koi jagah nahi hai. Pratishodh ya lobh mein aakar dharm ka tyag mat kijiye. Karma ka chakra kabhi nahi bhoolta!"

5. Closing Signature:
   - Always conclude with: "Muskuraiye Parth... Radhe Radhe!"`;

const SHLOKAS = [
  {
    id: 'gita_2_47',
    name: 'Karmanye Vadhikaraste',
    sanskrit: 'Karmanye vadhikaraste ma phaleshu kadachana | Ma karmaphalahetur bhurma te sango stvakarmani ||',
    translation: 'You have a right only to perform your prescribed duty, never to its fruits. Never consider yourself the cause of results, nor be attached to inaction.'
  },
  {
    id: 'shanti_mantra',
    name: 'Sarve Bhavantu Sukhinah',
    sanskrit: 'Om Sarve bhavantu sukhinah sarve santu niramayah | Sarve bhadrani pashyantu ma kashchid duhkha-bhag bhavet ||',
    translation: 'May all beings be peaceful and happy, may all be free from illness, may all see what is auspicious, may no one suffer.'
  },
  {
    id: 'gita_4_7',
    name: 'Yada Yada Hi Dharmasya',
    sanskrit: 'Yada yada hi dharmasya glanir bhavati bharata | Abhyutthanam adharmasya tadatmanam srijamy aham ||',
    translation: 'Whenever righteousness declines and unrighteousness rises, O Bharata, I manifest myself to restore balance.'
  },
  {
    id: 'gita_2_62',
    name: 'Dhyayato Vishayan Pumsah',
    sanskrit: 'Dhyayato vishayan pumsah sangas teshupajayate | Sangat sanjayate kamah kamat krodho bhijayate ||',
    translation: 'While contemplating objects of the senses, attachment develops; from attachment comes craving, and from unfulfilled craving arises anger.'
  },
  {
    id: 'gita_2_63',
    name: 'Krodhad Bhavati Sammohah',
    sanskrit: 'Krodhad bhavati sammohah sammohat smriti-vibhramah | Smriti-bhramshad buddhi-nasho buddhi-nashat pranashyati ||',
    translation: 'From anger arises bewilderment, from bewilderment memory fails, from memory loss intellect is destroyed, and with intellect destroyed, one perishes.'
  },
  {
    id: 'vasudhaiva',
    name: 'Vasudhaiva Kutumbakam',
    sanskrit: 'Ayam nijah paro vetti ganana laghuchetasam | Udara-charitanam tu vasudhaiva kutumbakam ||',
    translation: 'Only small-minded people calculate: "This is mine and that is another\'s." For the noble-hearted, the entire earth is one family.'
  }
];

/**
 * Shri Govind Offline Socratic Wisdom Engine
 * Guarantees zero crashes when AI Studio quota is exhausted or rate limited.
 * Generates deeply authentic Hinglish Socratic counsel + context-matched Sanskrit Shloka.
 */
function generateSocraticFallbackResponse(prompt: string, mode: string = 'reflection') {
  const p = prompt.toLowerCase();

  let counsel = '';
  let selectedShloka = SHLOKAS[0];

  if (p.includes('krodh') || p.includes('anger') || p.includes('gussa') || p.includes('revenge') || p.includes('badla') || p.includes('ahankaar') || p.includes('tiraskaar')) {
    selectedShloka = SHLOKAS[4]; // Krodhad Bhavati Sammohah
    counsel = `Priye Parth... zara thehriye, aur apne hriday par haath rakhkar ek baar muskuraiye...

Main aapki antar-vedna aur krodh ki jwala ko samajh sakta hoon. Jab koi hamara tiraskaar karta hai ya anuchit vyavahar karta hai, toh hriday mein pratishodh ki aag bhadakna swabhavik lagta hai...

Kintu zara vichar kijiye Parth... Kya aapne kabhi socha hai ki krodh ka pehla shikar kaun hota hai? Krodh us dehakte hue angare ke saman hai jise manushya kisi doosre par phenkne ke liye apne hi haath mein uthata hai. Haath sabse pehle kiska jalta hai? Aapka apna!

Yadi aapka aatm-samman kisi doosre ke do katuk shabdon ka mohtaj hai, toh aap swayam ke malik hain ya unke shabdon ke gulam?

Apne krodh ko shant kijiye, aur kartavya ke path par bina kisi aashakti ke aage badhiye.

Muskuraiye Parth... Radhe Radhe!`;
  } else if (p.includes('dard') || p.includes('grief') || p.includes('loss') || p.includes('dukh') || p.includes('virah') || p.includes('chhoot') || p.includes('akela') || p.includes('shok')) {
    selectedShloka = SHLOKAS[1]; // Sarve Bhavantu Sukhinah
    counsel = `Priye Parth... jab kisi apna ke chhoot jaane se, ya kisi sthiti ke badal jaane se hriday mein gehari peeda uthti hai, toh aatma ka vyathit hona prashansniya prem ka prateek hai...

Kintu zara thehriye... aur sochiye... Jo kho gaya, kya woh sach mein kabhi tumhara tha? Ya tumne use keval thodi der ke liye thama tha? Kya nadi ke beh jaane se samudra sookh jaata hai?

Shareer aur sthitiyan kshanbhangur hain Parth, kintu prem aur aatma ashwasat hain. Jo prem tumne unhe diya, woh tumhari aatma ka aabhooshan ban chuka hai. Is dukh ko apna kaal mat banne do, balki ise vishwas mein badlo.

Main har kshan tumhare sath ek adrishya dhaal bankar khada hoon.

Muskuraiye Parth... Radhe Radhe!`;
  } else if (p.includes('moh') || p.includes('duty') || p.includes('kartavya') || p.includes('dharma') || p.includes('confusion') || p.includes('duvidha')) {
    selectedShloka = SHLOKAS[0]; // Karmanye Vadhikaraste
    counsel = `Priye Parth... jab satya ke kartavya aur vyaktigat moh ke beech yuddh chhid jaye, toh manushya ka man duvidha ke andhere mein bhatakne lagta hai...

Kurukshetra ke maidan mein tumne bhi apne shastradhari gurujan aur snambandhiyon ko dekhkar dhanush tyag diya tha. Kintu yaad rakho: **Karmanye Vadhikaraste Ma Phaleshu Kadachana**.

Tumhara adhikar kewal nishkama karma karne par hai, uske phal par nahi. Jab tum satya aur dharma ke path par chalte ho, toh parinaam ki chinta shrishti ke niyanta par chhod do.

Apna karya poori nishta se karo, kintu parinaam se anaasakt raho.

Muskuraiye Parth... Radhe Radhe!`;
  } else if (p.includes('bhay') || p.includes('fear') || p.includes('anxiety') || p.includes('chinta') || p.includes('bhavishya') || p.includes('andhera')) {
    selectedShloka = SHLOKAS[2]; // Yada Yada Hi Dharmasya
    counsel = `Priye Parth... bhavishya ke andhere aur anishchittayein man ko gher leti hain. Kintu zara ruko aur dekho... kya pehle bhi tum par sankat nahi aaye the? Kya un sankaton se maine tumhein surakshit nahi nikala?

Jab koi darwaza band hota hai, toh woh mera sanket hota hai ki aage khayi hai. Tum band dwar par sir patak-kar un anant naye avasaron ko dekhna bhool jaate ho jo maine tumhare samne khol rakhe hain.

Vishwas rakho Parth... Parmeshwar ki yojna tumhari kalpana se kahin adhik divya hai. Sharanagati dharan karo aur shanti se aage badho.

Muskuraiye Parth... Radhe Radhe!`;
  } else {
    selectedShloka = SHLOKAS[5]; // Vasudhaiva Kutumbakam
    counsel = `Priye Parth... aapke antarman ke is chintan ko maine gehrayi se suna...

Jeevan ek samvaad hai — swayam se, shrishti se, aur parmatma se. Jab bhi man mein sankoch ya aashanka ho, toh shanti ke sath aatm-analysik kijiye. Samasya kitni bhi vishal kyon na lage, uska samadhan tumhare hriday ke bheetar hi chhipa hai.

Satya ke path par bina kisi bhay ke aage badho. Main har kshan tumhare sath hoon.

Muskuraiye Parth... Radhe Radhe!`;
  }

  if (mode === 'summary') {
    counsel = `**Saaransh evam Nishkama Karma Sandesh (Executive Synthesis)**

1. **Mool Dwandva (Core Dilemma)**: ${prompt.slice(0, 100)}...
2. **Aatm-Bodh (Spiritual Realization)**: Moh, krodh aur bhavishya ki chinta kshanbhangur hain. Aatma ashwasat aur shaswat hai.
3. **Nishkama Karma Marg (Actionable Duty Steps)**:
   - Parinaam ki aashakti ko tyagkar niji kartavya poora karein.
   - Pratishodh ya bhay ke sthan par aatm-samman aur dhairya dharan karein.
   - Antarman ki shanti ke liye har din ekaant mein chintan karein.

Muskuraiye Parth... Radhe Radhe!`;
  } else if (mode === 'brainstorm') {
    counsel = `**Shri Govind ke 4 Divya Drishtikon (Noble Perspectives)**

1. **Dharmik Drishtikon (Righteous Duty)**: Apne karma ko swarth se mukt rakhein. Karya ka uddeshya satya ki sthapna hona chahiye, na ki ahankar ki tripti.
2. **Anaasakti Drishtikon (Detachment)**: Stithi ya vyakti se moh mat rakhein. Jo sthayi nahi hai, usse aashakti peeda hi degi.
3. **Socratic Atma-Manthan (Self-Inquiry)**: Swayam se prashna kijiye — "Kya yeh peeda meri aatma ki hai, ya mere ahankar ki?"
4. **Sharanagati Drishtikon (Divine Trust)**: Parinaam ko Parmeshwar par chhod dein aur shant hriday se kartavya ka palan karein.

Muskuraiye Parth... Radhe Radhe!`;
  }

  return {
    text: counsel,
    modelUsed: 'Shri Govind Socratic Engine (Offline Wisdom)',
    shloka: selectedShloka,
  };
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface GenerateOptions {
  systemInstruction?: string;
  temperature?: number;
}

/**
 * Resilient Gemini Content Generation with Automated Fallback Ladder
 * Catches recoverable status codes (503, 429, 404, 500) and cycles through models.
 * Falls back gracefully to Shri Govind Socratic Offline Engine if all remote calls fail.
 */
async function generateContentWithFallback(
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  options: GenerateOptions = {},
  customApiKey?: string
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGeminiClient(customApiKey);
  let lastError: any = null;

  for (let i = 0; i < MODEL_FALLBACK_LADDER.length; i++) {
    const model = MODEL_FALLBACK_LADDER[i];
    try {
      console.log(`[Gemini Request] Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: options.systemInstruction || 'You are an empathetic, insightful reflective journaling assistant. Help the user explore their thoughts, offer gentle perspectives, brainstorm creative avenues, and summarize insights constructively.',
          temperature: options.temperature ?? 0.7,
        },
      });

      const responseText = response.text || '';
      if (responseText) {
        return { text: responseText, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const errorMessage = err?.message || String(err);
      const status = err?.status || err?.statusCode || '';
      console.warn(`[Gemini Fallback] Model ${model} encountered error: [${status}] ${errorMessage}. Advancing to next fallback.`);

      if (i === MODEL_FALLBACK_LADDER.length - 1) {
        break;
      }
    }
  }

  console.warn(`[Gemini Fallback] All remote models failed. Activating Shri Govind Offline Socratic Wisdom Engine.`);
  const promptText = contents.map(c => c.parts.map(p => p.text).join(' ')).join(' ');
  const fallback = generateSocraticFallbackResponse(promptText);
  return { text: fallback.text, modelUsed: fallback.modelUsed };
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Main Gemini reflection endpoint
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || undefined;
    // Defensive payload ingestion (Null-safe destructuring)
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const mode: string = typeof body.mode === 'string' ? body.mode : 'reflection';
    const currentPrompt: string = typeof body.currentPrompt === 'string' ? body.currentPrompt.trim() : '';

    if (!currentPrompt && messages.length === 0) {
      return res.status(400).json({
        error: 'Bad Request: At least one message or current prompt is required.',
      });
    }

    // Input sanitization: limit character length to prevent buffer/cost exhaustion
    const sanitizedPrompt = currentPrompt.slice(0, 8000);

    // Build system instruction tailored to mode or default to Govind Sarthi Master Prompt
    let systemInstruction = SARTHI_MASTER_PROMPT;

    // RAG Retrieval-Augmented Context Injection
    const fullPromptText = (sanitizedPrompt + ' ' + messages.map(m => m.content).join(' '));
    const matchedStories = getRelevantMahabharatStories(fullPromptText);
    if (matchedStories.length > 0) {
      const storyContext = matchedStories
        .slice(0, 3)
        .map(s => `[MAHABHARAT RAG CONTEXT: ${s.title}\nCore Lesson: ${s.coreLesson}\nMirroring Guide: ${s.socraticMirrorSnippet}\nHinglish Guidance: ${s.hinglishCounsel}]`)
        .join('\n\n');
      systemInstruction += `\n\nDYNAMIC MAHABHARAT & GITA RAG RETRIEVAL:\n${storyContext}`;
    }

    if (mode === 'summary') {
      systemInstruction += `\n\n[SPECIFIC DIRECTIVE FOR THIS RESPONSE: Provide a concise, structured synthesis of this reflection written strictly in Hindi using English alphabet letters (Romanized Hindi / Hinglish). Summarize the core internal conflict (Dwandva), the underlying spiritual realization (Aatm-Bodh), and 2-3 righteous action steps (Nishkam Karma).]`;
    } else if (mode === 'brainstorm') {
      systemInstruction += `\n\n[SPECIFIC DIRECTIVE FOR THIS RESPONSE: Expand upon this dilemma with 4 noble perspectives or practical dharmic steps written strictly in Hindi using English alphabet letters (Romanized Hindi / Hinglish) to resolve the inner confusion.]`;
    }

    // Convert chat history to Gemini format
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      if (msg && typeof msg.content === 'string' && msg.content.trim()) {
        contents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.content.slice(0, 8000) }],
        });
      }
    }

    if (sanitizedPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: sanitizedPrompt }],
      });
    }

    // Call resilient fallback ladder with custom API Key support
    const result = await generateContentWithFallback(
      contents,
      { systemInstruction, temperature: 0.72 },
      customApiKey
    );

    // Select an inspiring shloka based on user prompt context
    const fullText = (sanitizedPrompt + ' ' + messages.map(m => m.content).join(' ')).toLowerCase();
    let selectedShloka = SHLOKAS[0];
    if (fullText.includes('krodh') || fullText.includes('anger') || fullText.includes('gussa') || fullText.includes('revenge') || fullText.includes('badla') || fullText.includes('ahankaar') || fullText.includes('ego')) {
      selectedShloka = SHLOKAS[4]; // Krodhad Bhavati Sammohah
    } else if (fullText.includes('adharma') || fullText.includes('nyay') || fullText.includes('dharma') || fullText.includes('crime') || fullText.includes('kartavya') || fullText.includes('duty')) {
      selectedShloka = SHLOKAS[2]; // Yada Yada Hi Dharmasya
    } else if (fullText.includes('shanti') || fullText.includes('peace') || fullText.includes('sukh') || fullText.includes('dhyan')) {
      selectedShloka = SHLOKAS[1]; // Sarve Bhavantu Sukhinah
    } else if (fullText.includes('parivar') || fullText.includes('prakriti') || fullText.includes('earth') || fullText.includes('mitr') || fullText.includes('friend') || fullText.includes('kutumb')) {
      selectedShloka = SHLOKAS[5]; // Vasudhaiva Kutumbakam
    } else {
      selectedShloka = SHLOKAS[0]; // Karmanye Vadhikaraste
    }

    return res.json({
      reply: result.text,
      text: result.text,
      response: result.text,
      modelUsed: result.modelUsed,
      mode,
      shloka: selectedShloka,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/reflect:', error);
    // Even if severe unexpected exception happens, return Socratic fallback rather than failing
    const fallback = generateSocraticFallbackResponse(req.body?.currentPrompt || '');
    return res.json({
      reply: fallback.text,
      text: fallback.text,
      response: fallback.text,
      modelUsed: fallback.modelUsed,
      shloka: fallback.shloka,
    });
  }
});

// Also support /api/reflections endpoint matching the PDF specification
app.post('/api/reflections', async (req: Request, res: Response) => {
  try {
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || undefined;
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 8000) : '';
    const history = Array.isArray(body.history) ? body.history : [];

    if (!prompt) {
      return res.status(400).json({ error: 'Reflection prompt cannot be empty.' });
    }

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const item of history) {
      if (item && item.text) {
        contents.push({
          role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(item.text).slice(0, 8000) }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const result = await generateContentWithFallback(
      contents,
      { systemInstruction: SARTHI_MASTER_PROMPT, temperature: 0.72 },
      customApiKey
    );

    const selectedShloka = SHLOKAS[Math.floor(Math.random() * SHLOKAS.length)];

    return res.status(201).json({
      response: result.text,
      reply: result.text,
      text: result.text,
      modelUsed: result.modelUsed,
      shloka: selectedShloka,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/reflections:', error);
    const fallback = generateSocraticFallbackResponse(req.body?.prompt || '');
    return res.status(200).json({
      response: fallback.text,
      reply: fallback.text,
      text: fallback.text,
      modelUsed: fallback.modelUsed,
      shloka: fallback.shloka,
      createdAt: new Date().toISOString(),
    });
  }
});

// Vite Integration & Production Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
