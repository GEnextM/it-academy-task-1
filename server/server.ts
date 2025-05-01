import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import axios, { AxiosRequestConfig, Method } from 'axios';

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
app.use(express.urlencoded({ extended: true }));

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

app.get('/form', (req: Request, res: Response) => {
    // Используем приведение типов и проверку на существование
    const surname = typeof req.query.surname === 'string' ? req.query.surname : '';
    const name = typeof req.query.im === 'string' ? req.query.im : '';

    const surnameError = surname.length < 3 && surname.length > 0 ? 'Слишком короткая фамилия!' : '';
    const nameError = name.length < 3 && name.length > 0 ? 'Слишком короткое имя!' : '';

    if(!surnameError && !nameError && surname.length > 0 && name.length > 0) {
        res.send(`<h1>Поздравляю</h1>`)
    } else {
        res.send(`
        <form action="/submit" method="post">
          Фамилия: <input type="text" name="surname" value="${surname}">
          <span style="color: red;">${surnameError}</span><br>
          Имя: <input type="text" name="name" value="${name}">
          <span style="color: red;">${nameError}</span><br>
          <input type="submit" value="Отправить">
        </form>
      `);
    }
});

app.post('/submit', (req: Request, res: Response) => {
    const { surname, name } = req.body;
    let surnameError = surname.length < 3;
    let nameError = name.length < 3;

    if (surnameError || nameError) {
        return res.redirect(`/form?fam=${encodeURIComponent(surname)}&im=${encodeURIComponent(name)}`);
    }
    res.send(`Вы ввели: Фамилия - ${surname}, Имя - ${name}`);
});

app.get('/postman', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, '../client/postman.html'));
});


app.post('/api/postman-request', async (req: Request, res: Response) => {
    try {
        const { url, method, params = [], headers = [], body: reqBody, contentType } = req.body;
        if (!/^https?:\/\/.+/i.test(url)) {
            res.status(400).json({ error: 'Некорректный URL' });
            return;
        }
        if (!['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS'].includes(method.toUpperCase())) {
            res.status(400).json({ error: 'Некорректный метод' });
            return;
        }

        const headersObj: Record<string, string> = {};
        headers.forEach(({ key, value }: { key: string, value: string }) => {
            if (key) headersObj[key] = value;
        });
        if (contentType) headersObj['Content-Type'] = contentType;

        let finalUrl = url;
        if (params.length && ['GET','DELETE','HEAD'].includes(method.toUpperCase())) {
            const query = params
                .filter((p: any) => p.key)
                .map((p: any) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || '')}`)
                .join('&');
            finalUrl += (url.includes('?') ? '&' : '?') + query;
        }

        const axiosConfig: AxiosRequestConfig = {
            method: method as Method,
            url: finalUrl,
            headers: headersObj,
            data: ['GET','DELETE','HEAD'].includes(method.toUpperCase()) ? undefined : reqBody,
            responseType: 'arraybuffer', // чтобы поддерживать и текст, и картинки
            validateStatus: () => true, // чтобы не кидал ошибку при любом статусе
        };

        const response = await axios(axiosConfig);

        const contentTypeHeader = response.headers['content-type'] || '';
        let responseBody: any;

        if (contentTypeHeader.includes('application/json')) {
            responseBody = JSON.parse(Buffer.from(response.data).toString('utf8'));
        } else if (contentTypeHeader.startsWith('image/')) {
            const buffer = Buffer.from(response.data);
            responseBody = buffer.toString('hex').match(/.{1,2}/g)?.join(' ');
        } else {
            responseBody = Buffer.from(response.data).toString('utf8');
        }

        res.json({
            status: response.status,
            headers: response.headers,
            body: responseBody,
            contentType: contentTypeHeader
        });
    } catch (err: any) {
        res.status(500).json({ error: String(err) });
    }
});

app.use((req: Request, res: Response) => {
    res.status(404).send('Not Found');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});