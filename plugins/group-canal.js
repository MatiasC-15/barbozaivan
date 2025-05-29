
var handler = async (m, { command }) => {
    if (command === 'canal') {
        const canalLink = 'https://whatsapp.com/channel/0029VbAw7KKFi8xmLcUEtA1o'; // Reemplaza esto con tu enlace real
        conn.reply(m.chat, `¡Aquí está el enlace de mi canal! 👉 ${canalLink}`, m);
    }
};
