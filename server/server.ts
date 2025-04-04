import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

interface Variant {
    id: number;
    text: string;
    votes: number;
    imageUrl: string;
}


const app = express();
const PORT = 7180;
const DATA_FILE = path.resolve(__dirname, '../server/data.json');
const USED_VOTES_FILE = path.resolve(__dirname, '../server/usedVotes.json');

app.use(express.json());
app.use('/public', express.static(path.resolve(__dirname, '../client/public')));

const readData = (): Variant[] => {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    }
    return [
        { id: 1, text: 'Мурзик', votes: 0, imageUrl: '/public/img1.jpeg' },
        { id: 2, text: 'Снежок', votes: 0, imageUrl: '/public/img2.jpg' },
        { id: 3, text: 'Кнопка', votes: 0, imageUrl: '/public/img3.jpg' },
        { id: 4, text: 'Лунтик', votes: 0, imageUrl: '/public/img4.jpg' },
    ];
};

const writeData = (variants: Variant[]) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(variants, null, 2));
};

const readUsedVoteIds = (): Set<string> => {
    if (fs.existsSync(USED_VOTES_FILE)) {
        const data = fs.readFileSync(USED_VOTES_FILE, 'utf-8');
        return new Set(JSON.parse(data));
    }
    return new Set();
};

const writeUsedVoteIds = (usedVoteIds: Set<string>) => {
    fs.writeFileSync(USED_VOTES_FILE, JSON.stringify(Array.from(usedVoteIds), null, 2));
};

let variants = readData();
let usedVoteIds = readUsedVoteIds();

app.get('/variants', (req: Request, res: Response) => {
    res.json(variants);
});

app.post('/vote', (req: Request, res: Response) => {
    const { id } = req.body;
    const voteId = req.headers['x-vote-id'];


    if (usedVoteIds.has(voteId as string)) {
        res.json({ success: false, message: 'Ваш голос уже засчитан <3' });
        return;
    }

    const variant = variants.find(v => v.id === id);
    if (variant) {
        variant.votes += 1;
        writeData(variants);
        usedVoteIds.add(voteId as string);
        writeUsedVoteIds(usedVoteIds);
        res.json({ success: true });
        return;
    } else {
        res.status(404).json({ success: false, message: 'Variant not found' });
        return;
    }
});

app.get('/stats', (req: Request, res: Response) => {
    res.json(variants);
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