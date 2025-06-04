const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const natural = require('natural');

// Inicializa el cliente con autenticación local
const client = new Client({
    authStrategy: new LocalAuth()
});

// Mostrar el código QR en terminal
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log(' Escanea este código QR con WhatsApp Web');
});

// Lista de usuarios autorizados
const usuariosAutorizados = [
    '573157463290@c.us',
    '573155210695@c.us'
];

// Corpus de preguntas y respuestas frecuentes
const qa = [
    { question: "¿Dónde están ubicados?", answer: "Estamos en Cali, Colombia." },
    { question: "¿Cuáles son los horarios?", answer: "Atendemos de lunes a viernes de 8 a.m. a 5 p.m." },
    { question: "¿Cómo me inscribo?", answer: "Puedes inscribirte en nuestra página web o escribiéndonos por este medio." },
    { question: "¿Cuánto cuesta?", answer: "Nuestros precios varían, ¿sobre qué producto quieres saber más?" },
    { question: "¿Tienen soporte?", answer: "Sí, tenemos soporte de lunes a sábado." },
    { question: "¿Aceptan pagos online?", answer: "Sí, aceptamos pagos con tarjeta y PSE." },
    { question: "¿Hay descuentos?", answer: "¡Claro! Tenemos promociones semanales." },
    { question: "¿Cómo hablo con un asesor?", answer: "Un asesor te escribirá en breve." },
    { question: "¿Quién eres?", answer: "Soy un bot de atención básica para este proyecto." },
    { question: "Hola", answer: "¡Hola! ¿Cómo estás?" }
];

// Preparar modelo TF-IDF
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();
qa.forEach(q => tfidf.addDocument(q.question));

// Al estar listo, enviar mensaje de bienvenida con imagen
client.on('ready', async () => {
    console.log('✅ Bot conectado y listo para enviar mensajes.');

    const contactos = usuariosAutorizados;

    const media = MessageMedia.fromFilePath('./assets/promocion.png');

    for (const contacto of contactos) {
        try {
            await client.sendMessage(contacto, media);
            await client.sendMessage(contacto, "¡Hola! Este es un mensaje de bienvenida del bot 🤖. ¡Conoce nuestros servicios!");
            console.log(`✅ Mensaje con imagen enviado a ${contacto}`);
        } catch (err) {
            console.error(`❌ Error enviando a ${contacto}:`, err);
        }
    }
});

// Procesar mensajes entrantes
client.on('message', async message => {
    const from = message.from;
    const userText = message.body;

    // Ignorar mensajes de usuarios no autorizados
    if (!usuariosAutorizados.includes(from)) {
        console.log(`⛔ Usuario no autorizado: ${from}`);
        return;
    }

    // Buscar la mejor respuesta por similitud
    let bestScore = 0;
    let bestAnswer = "Lo siento, no entendí tu mensaje. ¿Puedes intentar de otra forma?";

    tfidf.tfidfs(userText, (i, score) => {
        if (score > bestScore) {
            bestScore = score;
            bestAnswer = qa[i].answer;
        }
    });

    // Si la respuesta es genérica, registrar la consulta
    if (bestAnswer === "Lo siento, no entendí tu mensaje. ¿Puedes intentar de otra forma?") {
        const registro = `${new Date().toISOString()} - ${from}: ${userText}\n`;
        fs.appendFile('consultas_no_reconocidas.txt', registro, (err) => {
            if (err) console.error('❌ Error al registrar consulta:', err);
        });
    }

    await message.reply(bestAnswer);
});

// Iniciar el cliente
client.initialize();
