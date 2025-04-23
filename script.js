document.addEventListener('DOMContentLoaded', () => {
 // --- Theme Selector Logic START ---
 const themeSelector = document.getElementById('themeSelector');
 const bodyElement = document.body;
 // Define ALL theme classes, including dark
 const themeClasses = ['theme-dark', 'theme-light', 'theme-sepia', 'theme-slate', 'theme-coral-blue']; // Added 'theme-dark'

 // Function to apply the selected theme
 const applyTheme = (themeValue) => {
     // Remove any existing theme classes from the list
     bodyElement.classList.remove(...themeClasses);

     // Always add the specific class for the selected theme
     const newThemeClass = `theme-${themeValue}`; // e.g., theme-dark, theme-light
     bodyElement.classList.add(newThemeClass);

     // Update the dropdown to show the current theme
     if (themeSelector) {
         themeSelector.value = themeValue;
     }
     // Save the preference
     localStorage.setItem('theme', themeValue);
 };

 // Add event listener for dropdown changes
 if (themeSelector) {
     themeSelector.addEventListener('change', (event) => {
         const selectedTheme = event.target.value;
         applyTheme(selectedTheme);
     });
 }

 // Check for saved theme preference on load
 const savedTheme = localStorage.getItem('theme');
 const initialTheme = savedTheme || 'dark'; // Default to 'dark' if nothing is saved
 applyTheme(initialTheme);
 // --- Theme Selector Logic END ---


    // --- Original Application Logic START ---
    const startForm = document.getElementById('startForm');

    // Logic for the index.html page (form submission)
    if (startForm) {
        startForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const intervalInput = document.getElementById('interval');
            const breakTimeInput = document.getElementById('breakTime');
            const imagesInput = document.getElementById('images');

            // Check if elements exist before accessing properties
            if (!intervalInput || !breakTimeInput || !imagesInput) {
                 console.error("Form elements not found!");
                 return;
            }

            const interval = intervalInput.value;
            const breakTime = breakTimeInput.value || 0; // Default to 0 if no break time is set
            const images = imagesInput.files;

            if (interval && images && images.length > 0) {
                // Save the interval and break time to localStorage
                localStorage.setItem('interval', interval);
                localStorage.setItem('breakTime', breakTime);

                // Store images in localForage
                // Clear previous images first to avoid accumulation if the user re-submits
                localforage.clear().then(() => {
                    const imagePromises = Array.from(images).map((file, index) => {
                        const reader = new FileReader();
                        return new Promise((resolve, reject) => {
                            reader.onload = function(event) {
                                localforage.setItem(`image-${index}`, event.target.result)
                                    .then(() => resolve())
                                    .catch(err => reject(err)); // Handle potential storage errors
                            };
                            reader.onerror = (error) => reject(error); // Handle file reading errors
                            reader.readAsDataURL(file);
                        });
                    });

                    // Once all images are stored, redirect to the practice page
                    Promise.all(imagePromises).then(() => {
                        window.location.href = 'practice.html';
                    }).catch(error => {
                         console.error("Error storing images:", error);
                         alert("There was an error saving the images. Please try again.");
                    });
                }).catch(error => {
                    console.error("Error clearing localForage:", error);
                    alert("Could not prepare storage for new images.");
                });
            } else {
                 alert("Please provide an interval and select at least one image.");
            }
        });
    }

    // Logic for the practice.html page
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
        const imageWrapper = document.getElementById('imageWrapper'); // Get wrapper for hiding/showing image + overlay

        // Ensure elements exist before proceeding
        if (!practiceImage || !timerElement || !pauseButton || !skipButton || !outOfImagesMessage ||
            !backToIndexButton || !breakScreen || !breakTimerElement || !skipBreakButton || !overlay || !imageWrapper) {
            console.error("One or more practice page elements not found!");
            // Optionally redirect or show an error message
            // window.location.href = 'index.html';
            return;
        }

        // Initialize state variables
        let imageTimer;
        let breakTimer;
        let currentImageIndex = -1; // Start at -1 to indicate no image selected yet
        let isPaused = false;
        let images = [];
        let shownIndices = new Set(); // Track indices of shown images
        let isBreakActive = false; // Track whether the break time is active

        // Helper function to hide main practice elements
        const hidePracticeUI = () => {
            if (imageWrapper) imageWrapper.style.display = 'none';
            if (timerElement) timerElement.style.display = 'none';
            if (pauseButton) pauseButton.style.display = 'none';
            if (skipButton) skipButton.style.display = 'none';
            if (overlay) overlay.style.display = 'none'; // Ensure overlay is hidden too
        };

        // Helper function to show main practice elements
        const showPracticeUI = () => {
            if (imageWrapper) imageWrapper.style.display = 'block';
             if (practiceImage) practiceImage.style.display = 'block'; // Make sure image itself is visible
            if (timerElement) timerElement.style.display = 'block';
            if (pauseButton) pauseButton.style.display = 'inline-block'; // Or 'block' depending on layout
            if (skipButton) skipButton.style.display = 'inline-block'; // Or 'block'
            if (overlay) overlay.style.display = isPaused ? 'block' : 'none'; // Show overlay only if paused
        };


        // Load all images from localForage
        localforage.keys().then((keys) => {
            const imageKeys = keys.filter(key => key.startsWith('image-'));
            if (imageKeys.length === 0) {
                // No images found, perhaps user landed here directly
                console.warn("No images found in storage.");
                hidePracticeUI();
                if(outOfImagesMessage) outOfImagesMessage.style.display = 'block';
                return Promise.reject("No images"); // Stop further processing
            }
            return Promise.all(imageKeys.map(key => localforage.getItem(key)));
        }).then((loadedImages) => {
            images = loadedImages;
            if (images.length > 0 && interval) {
                 showNextImage(); // Start the process if images and interval are loaded
            } else {
                 // Handle case where images loaded but interval is missing (shouldn't happen with form validation)
                 console.error("Interval missing, cannot start practice.");
                 alert("Configuration error: Interval is missing.");
                 hidePracticeUI();
                 if(outOfImagesMessage) outOfImagesMessage.style.display = 'block';
            }
        }).catch(error => {
             if (error !== "No images") { // Avoid logging the "No images" rejection as an error
                 console.error("Error loading images from localForage:", error);
                 alert("Could not load images for practice.");
             }
             // Ensure UI indicates the problem if loading fails
             hidePracticeUI();
             if(outOfImagesMessage) outOfImagesMessage.style.display = 'block';
        });

        function startImageTimer(duration) {
            clearInterval(imageTimer); // Clear any existing timer
            let timeLeft = duration;
            timerElement.textContent = timeLeft;
            isPaused = false; // Ensure not paused when timer starts
            pauseButton.textContent = '⏸';
            overlay.style.display = 'none';

            imageTimer = setInterval(() => {
                if (!isPaused) {
                    timeLeft--;
                    timerElement.textContent = timeLeft;

                    if (timeLeft <= 0) {
                        clearInterval(imageTimer);
                        // Decide whether to go to break or next image
                        if (!isBreakActive && breakTime > 0) {
                             startBreak();
                        } else {
                             showNextImage(); // Go directly to next image if no break or break just finished
                        }
                    }
                }
            }, 1000);
        }

        function startBreak() {
            isBreakActive = true;
            hidePracticeUI(); // Hide the image/timer/controls
            breakScreen.style.display = 'flex'; // Show break screen (use flex if you styled it that way)
            startBreakTimer(parseInt(breakTime));
        }

        function startBreakTimer(duration) {
            clearInterval(breakTimer); // Clear any existing break timer
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
            isBreakActive = false;
            breakScreen.style.display = 'none'; // Hide break screen
            showNextImage(); // Proceed to the next image
        }

        function showNextImage() {
             clearInterval(imageTimer); // Stop previous timer if any (e.g., if skipping)
            if (shownIndices.size >= images.length) {
                // All images have been shown
                hidePracticeUI();
                outOfImagesMessage.style.display = 'block';
            } else {
                let nextIndex;
                do {
                    nextIndex = Math.floor(Math.random() * images.length);
                } while (shownIndices.has(nextIndex));

                shownIndices.add(nextIndex);
                currentImageIndex = nextIndex; // Keep track of the current image index

                practiceImage.src = images[currentImageIndex];
                showPracticeUI(); // Show the image and controls
                startImageTimer(parseInt(interval)); // Start the timer for the new image
            }
        }

        // Event Listeners for buttons
        if(pauseButton) {
            pauseButton.addEventListener('click', () => {
                isPaused = !isPaused;
                pauseButton.textContent = isPaused ? '▸' : '⏸'; // Play/Pause icon
                overlay.style.display = isPaused ? 'block' : 'none'; // Show/hide overlay
            });
        }

        if(skipButton) {
            skipButton.addEventListener('click', () => {
                clearInterval(imageTimer); // Stop image timer
                if (isBreakActive) {
                    clearInterval(breakTimer); // Stop break timer if active
                    endBreak(); // End break and show next image immediately
                } else {
                    showNextImage(); // Skip current image and show next one
                }
            });
        }

        if(skipBreakButton) {
            skipBreakButton.addEventListener('click', () => {
                clearInterval(breakTimer); // Stop break timer
                endBreak(); // End break and show next image immediately
            });
        }

        if(backToIndexButton) {
            backToIndexButton.addEventListener('click', () => {
                // Clear timers just in case
                clearInterval(imageTimer);
                clearInterval(breakTimer);
                // Clear storage and redirect
                localforage.clear().then(() => {
                    localStorage.removeItem('interval');
                    localStorage.removeItem('breakTime');
                    // Keep theme preference
                    // localStorage.removeItem('theme'); // Uncomment if you want to reset theme too
                    window.location.href = 'index.html';
                }).catch(error => {
                     console.error("Error clearing storage:", error);
                     // Still redirect even if clearing fails
                     window.location.href = 'index.html';
                });
            });
        }
    }
    // --- Original Application Logic END ---

}); // End of DOMContentLoaded