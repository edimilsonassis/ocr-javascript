const save = document.getElementById('save')
const read = document.getElementById('read')
const files = document.getElementById('files')
const result = document.getElementById('result')
const progress = document.getElementById('progress')
const selvoices = document.getElementById('selvoices')


async function work() {
    if (!files.files.length)
        return;

    const worker = await Tesseract.createWorker('por');

    for (let i = files.files.length - 1; i >= 0; i--) {
        const file = files.files[i];
        const ret = await worker.recognize(file);
        result.value += `${ret.data.text.replaceAll(`\n`, ' ')}\n\n`;
        progress.innerHTML = `Processado ${files.files.length - i} de ${files.files.length}`;
    }

    result.dispatchEvent(new Event('change'))

    read.click();

    await worker.terminate();
}

files.addEventListener('change', work);

save.addEventListener('click', () => {
    const blob = new Blob([result.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'result.txt';
    a.click();
});

document.addEventListener('paste', async (e) => {
    console.log('paste');

    if (e.clipboardData.files.length) {
        result.value = '';
        files.files = e.clipboardData.files;
        await work();
    }

    if (e.clipboardData.types.indexOf('text/plain') > -1) {
        let newText = e.clipboardData.getData('text/plain');

        console.log(newText);

        // newText = newText.replaceAll('IV ', '');
        // newText = newText.replaceAll('III ', '');
        // newText = newText.replaceAll('II ', '');
        // newText = newText.replaceAll('I ', '');
        // newText = newText.replaceAll('V ', '');

        if (result.value == newText) {
            console.log('igual');
            newText = newText.replaceAll(`\n`, ' ');
        }

        result.value = newText;
        result.dispatchEvent(new Event('change'));
    }
});

let rate = document.getElementById('rate');

class Speaker {
    constructor() {
        this.list = document.getElementById('list');
        this.template = this.list.children[0];
        this.texts = [];
        this.pauseOnEnd = false;
        this.itemToRead = 0;
        this.speaking = false;
        this.utt = new SpeechSynthesisUtterance();
        this.synth = window.speechSynthesis;

        this.utt.onend = () => {
            read.innerHTML = "Ler";
            progress.innerHTML = "Leitura finalizada";
            if (this.pauseOnEnd)
                return;
            this.itemToRead++;
            this.speak();
        }

        this.utt.onstart = () => {
            read.innerHTML = "Parar";
        }

        this.utt.onerror = (error) => {
            if (error.error === "interrupted")
                return;

            progress.innerHTML = "Tentar novamente";

            this.speak();
        }
    }

    fillListItems() {

        this.list.innerHTML = '';

        this.texts.forEach((text, index) => {
            const li = this.template.cloneNode(true);

            li.querySelector('p').innerHTML = text;

            li.onclick = (e) => {
                let tagName = e.target.tagName.toUpperCase();

                if (tagName != 'P' && tagName != 'LI')
                    return;

                this.itemToRead = index;

                this.synth.cancel();

                this.speak();
            }

            const buttonRemove = li.querySelector('button')

            buttonRemove.onclick = () => {
                this.texts.splice(index, 1);
                // this.fillListItems();
                result.value = this.texts.join('\n');
                li.remove();
            }

            this.list.appendChild(li);
        });
    }

    add(text) {
        this.texts = text.replaceAll('\n', '|').split('|').filter(e => e.trim());

        this.fillListItems();
    }

    cancel() {
        this.synth.cancel();
        this.itemToRead = 0;
        this.speaking = false;
        read.innerHTML = "Ler";
        progress.innerHTML = "Leitura cancelada";
    }

    speak() {
        if (this.itemToRead <= this.texts.length - 1) {

            progress.innerHTML = `Lendo ${this.itemToRead + 1} de ${this.texts.length}`;

            this.speaking = true;
            this.utt.text = this.texts[this.itemToRead]

            if (!this.utt.text) {
                this.speaking = false;
                return;
            }

            this.utt.rate = rate.value;

            this.synth.speak(this.utt);

            document.getElementById('list').querySelectorAll('li.active').forEach(li => li.classList.remove('active'));

            document.getElementById('list').children[this.itemToRead].classList.add('active');
        } else {
            read.innerHTML = "Ler";
            progress.innerHTML = "Nada para ler";
            this.speaking = false;
        }
    }
}

const synth = new Speaker();

result.addEventListener('change', () => {
    synth.add(result.value);
    synth.itemToRead = 0;
});

read.addEventListener('click', () => {
    read.innerHTML = "Carregando...";
    progress.innerHTML = "Iniciando leitura";

    if (synth.speaking) {
        return synth.cancel();
    }

    synth.speak();
});

function fillselvoices() {
    selvoices.innerHTML = "";

    var e = synth.synth.getVoices().filter(function (e) {
        return e.lang == "pt-BR";
    });

    for (var t = 0; t < e.length; t++) {
        var n = document.createElement("option");
        n.text = e[t].name;
        selvoices.add(n);
    }

    selvoices.selectedIndex = 2;
    selvoices.dispatchEvent(new Event("change"));
}

selvoices.addEventListener("change", function () {
    synth.utt.voice = synth.synth.getVoices().filter(function (e) {
        return e.name == selvoices.value;
    })[0];
});

const tabLinks = document.querySelectorAll('.tablinks');

tabLinks.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabContent = document.querySelectorAll('.tabcontent');
        tabContent.forEach(tab => tab.classList.remove('active'));

        const tabName = tab.getAttribute('data-tab');
        document.getElementById(tabName).classList.add('active');
    });
});

fillselvoices();
setTimeout(fillselvoices, 100);

window.addEventListener('beforeunload', function (e) {
    if (synth.speaking) {
        synth.cancel();
        return;
    }
    e.preventDefault();
    e.returnValue
})