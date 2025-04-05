import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

interface Variant {
    id: number;
    text: string;
    imageUrl: string;
}

interface Vote {
    id: number;
    votes: number;
}

const app = express();
const PORT = 7180;
const DATA_FILE = path.resolve(__dirname, '../server/data.json');
const VOTES_FILE = path.resolve(__dirname, '../server/votes.json');
const USED_VOTES_FILE = path.resolve(__dirname, '../server/usedVotes.json');

app.use(express.json());
app.use('/public', express.static(path.resolve(__dirname, '../client/public')));

const readVariants = (): Variant[] => {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    }
    return [
        { id: 1, text: 'Мурзик', imageUrl: '/public/img1.jpeg' },
        { id: 2, text: 'Снежок', imageUrl: '/public/img2.jpg' },
        { id: 3, text: 'Кнопка', imageUrl: '/public/img3.jpg' },
        { id: 4, text: 'Лунтик', imageUrl: '/public/img4.jpg' },
    ];
};

const writeVariants = (variants: Variant[]) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(variants, null, 2));
};

const readVotes = (): Vote[] => {
    if (fs.existsSync(VOTES_FILE)) {
        const data = fs.readFileSync(VOTES_FILE, 'utf-8');
        return JSON.parse(data);
    }
    return [
        { id: 1, votes: 0 },
        { id: 2, votes: 0 },
        { id: 3, votes: 0 },
        { id: 4, votes: 0 },
        { id: 5, votes: 0 },
    ];
};

const writeVotes = (votes: Vote[]) => {
    fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2));
};

const readUsedVoteIps = (): Set<string> => {
    if (fs.existsSync(USED_VOTES_FILE)) {
        const data = fs.readFileSync(USED_VOTES_FILE, 'utf-8');
        return new Set(JSON.parse(data));
    }
    return new Set();
};

const writeUsedVoteIps = (usedVoteIps: Set<string>) => {
    fs.writeFileSync(USED_VOTES_FILE, JSON.stringify(Array.from(usedVoteIps), null, 2));
};

let variants = readVariants();
let votes = readVotes();
let usedVoteIps = readUsedVoteIps();

if (!fs.existsSync(DATA_FILE)) {
    writeVariants(variants);
}
if (!fs.existsSync(VOTES_FILE)) {
    writeVotes(votes);
}

app.get('/variants', (req: Request, res: Response) => {
    res.json(variants);
});

app.get('/votes', (req: Request, res: Response) => {
    res.json(votes);
});

app.post('/vote', (req: Request, res: Response) => {
    const { id } = req.body;
    const ip = req.connection.remoteAddress;
    const voteId = req.headers['x-vote-id'] as string;

    const uniqueVoter = voteId || ip || '0';

    if (usedVoteIps.has(uniqueVoter)) {
        res.json({ success: false, message: 'Ваш голос уже засчитан <3' });
        return;
    }

    const voteItem = votes.find(v => v.id === id);
    if (voteItem) {
        voteItem.votes += 1;
        writeVotes(votes);
        usedVoteIps.add(uniqueVoter);
        writeUsedVoteIps(usedVoteIps);
        res.json({ success: true });
        return;
    } else {
        res.status(404).json({ success: false, message: 'Variant not found' });
        return;
    }
});

app.post('/stats', (req: Request, res: Response) => {
    res.json(votes);
});

app.get('/index', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, '../client/index.html'));
});

app.use((req: Request, res: Response) => {
    res.status(404).send('Not Found');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});