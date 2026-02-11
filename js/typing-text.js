class TypingText {
    constructor() {
        this.texts = [
            'worship pp cat...',
            'spin your mouse...',
            'meet friends...'
        ];
        this.currentIndex = 0;
        this.isDeleting = false;
        this.currentText = '';
        this.typingSpeed = 100;
        this.deletingSpeed = 50;
        this.pauseEnd = 2000;
        this.pauseStart = 1000;
        
        this.element = document.querySelector('.typing-text');
        if (this.element) {
            this.type();
        }
    }

    type() {
        const fullText = this.texts[this.currentIndex];
        
        if (this.isDeleting) {

            this.currentText = fullText.substring(0, this.currentText.length - 1);
        } else {

            this.currentText = fullText.substring(0, this.currentText.length + 1);
        }

        this.element.textContent = this.currentText;

        let typeSpeed = this.isDeleting ? this.deletingSpeed : this.typingSpeed;

        if (!this.isDeleting && this.currentText === fullText) {

            typeSpeed = this.pauseEnd;
            this.isDeleting = true;
        } else if (this.isDeleting && this.currentText === '') {

            this.isDeleting = false;
            this.currentIndex = (this.currentIndex + 1) % this.texts.length;
            typeSpeed = this.pauseStart;
        }

        setTimeout(() => this.type(), typeSpeed);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TypingText();
});
