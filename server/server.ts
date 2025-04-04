import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

interface Variant {
    id: number;
    text: string;
    votes: number;
    imageUrl: string
}

const app = express();
const PORT = 7180;
const DATA_FILE = path.resolve(__dirname, '../server/data.json');

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

let variants = readData();
app.get('/variants', (req: Request, res: Response) => {
    res.json(variants);
});

app.post('/vote', (req: Request, res: Response) => {
    const { id } = req.body;
    const variant = variants.find(v => v.id === id);
    if (variant) {
        variant.votes += 1;
        writeData(variants);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Variant not found' });
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