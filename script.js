document.addEventListener('DOMContentLoaded', () => {
    const startForm = document.getElementById('startForm');

    startForm?.addEventListener('submit', function (event) {
        event.preventDefault();

        const interval = document.getElementById('interval').value;
        const breakTime = document.getElementById('breakTime').value || 0; // Default to 0 if no break time is set
        const images = document.getElementById('images').files;

        if (interval && images.length > 0) {
            // Save the interval and break time to localStorage
            localStorage.setItem('interval', interval);
            localStorage.setItem('breakTime', breakTime);

            // Store images in localForage
            const imagePromises = Array.from(images).map((file, index) => {
                const reader = new FileReader();
                return new Promise((resolve) => {
                    reader.onload = function(event) {
                        localforage.setItem(`image-${index}`, event.target.result).then(() => resolve());
                    };
                    reader.readAsDataURL(file);
                });
            });

            // Once all images are stored, redirect to the practice page
            Promise.all(imagePromises).then(() => {
                window.location.href = 'practice.html';
            });
        }
    });
    
    if (window.location.pathname.endsWith('practice.html')) {
        const interval = localStorage.getItem('interval');
        const breakTime = localStorage.getItem('breakTime') || 0;
        const practiceImage = document.getElementById('practiceImage');
        const timerElement = document.getElementById('timer');
        const pauseButton = document.getElementById('pauseButton');
        const skipButton = document.getElementById('skipButton');
        const outOfImagesMessage = document.getElementById('outOfImages');
        const backToIndexButton = document.getElementById('backToIndex');
        const breakScreen = document.getElementById('breakScreen');
        const breakTimerElement = document.getElementById('breakTimer');
        const skipBreakButton = document.getElementById('skipBreakButton');
        const overlay = document.getElementById('overlay');

        let timer;
        let currentImageIndex = 0;
        let isPaused = false;
        let images = [];
        let shownImages = new Set(); // To track shown images
        let isBreakTime = false; // To track whether the break time is active
        let breakTimer; // Variable to hold break timer

        // Load all images from localForage
        localforage.keys().then((keys) => {
            const imageKeys = keys.filter(key => key.startsWith('image-'));
            return Promise.all(imageKeys.map(key => localforage.getItem(key)));
        }).then((loadedImages) => {
            images = loadedImages;
            showNextImage();
        });

        function startTimer(duration) {
            let timeLeft = duration;
            timerElement.textContent = timeLeft;

            timer = setInterval(() => {
                if (!isPaused) {
                    timeLeft--;
                    timerElement.textContent = timeLeft;

                    if (timeLeft <= 0) {
                        clearInterval(timer);
                        if (isBreakTime) {
                            endBreak(); // End break and show next image
                        } else {
                            startBreak();
                        }
                    }
                }
            }, 1000);
        }

        function startBreak() {
            if (breakTime > 0) {
                isBreakTime = true;
                practiceImage.style.display = 'none';
                timerElement.style.display = 'none';
                pauseButton.style.display = 'none';
                skipButton.style.display = 'none';
                breakScreen.style.display = 'block';
                startBreakTimer(parseInt(breakTime));
            } else {
                showNextImage();
            }
        }

        function startBreakTimer(duration) {
            let timeLeft = duration;
            breakTimerElement.textContent = timeLeft;

            breakTimer = setInterval(() => {
                timeLeft--;
                breakTimerElement.textContent = timeLeft;

                if (timeLeft <= 0) {
                    clearInterval(breakTimer);
                    endBreak();
                }
            }, 1000);
        }

        function endBreak() {
            isBreakTime = false;
            breakScreen.style.display = 'none';
            showNextImage();
        }

        function showNextImage() {
            if (shownImages.size >= images.length) {
                // All images have been shown
                practiceImage.style.display = 'none';
                timerElement.style.display = 'none';
                pauseButton.style.display = 'none';
                skipButton.style.display = 'none';
                outOfImagesMessage.style.display = 'block';
            } else {
                do {
                    currentImageIndex = Math.floor(Math.random() * images.length);
                } while (shownImages.has(currentImageIndex));

                shownImages.add(currentImageIndex);
                practiceImage.src = images[currentImageIndex];
                practiceImage.style.display = 'block';
                timerElement.style.display = 'block';
                pauseButton.style.display = 'inline-block';
                skipButton.style.display = 'inline-block';
                overlay.style.display = 'none'; // Hide overlay
                startTimer(parseInt(interval));
            }
        }

        pauseButton.addEventListener('click', () => {
            isPaused = !isPaused;
            pauseButton.textContent = isPaused ? '▸' : '⏸';
            overlay.style.display = isPaused ? 'block' : 'none'; // Show or hide overlay based on pause state
        });

        skipButton.addEventListener('click', () => {
            clearInterval(timer); // Clear image timer
            if (isBreakTime) {
                clearInterval(breakTimer); // Clear break timer if active
                endBreak(); // End the break and show the next image
            } else {
                showNextImage(); // Skip image and go to the next one
            }
        });

        skipBreakButton.addEventListener('click', () => {
            clearInterval(breakTimer); // Clear break timer
            endBreak(); // End the break and show the next image
        });

        // Handle the "Back to Index" button
        backToIndexButton.addEventListener('click', () => {
            localforage.clear().then(() => {
                localStorage.removeItem('interval');
                localStorage.removeItem('breakTime');
                window.location.href = 'index.html';
            });
        });
    }
});
