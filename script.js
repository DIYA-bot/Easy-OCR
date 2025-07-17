// script.js

document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('image-upload');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const targetLanguageSelect = document.getElementById('target-language');
    const processImageBtn = document.getElementById('process-image-btn');
    const buttonText = document.getElementById('button-text');
    const spinner = document.getElementById('spinner');
    const errorMessageDiv = document.getElementById('error-message');
    const errorTextSpan = document.getElementById('error-text');
    const extractedHindiTextDiv = document.getElementById('extracted-hindi-text');
    const translatedTextDiv = document.getElementById('translated-text');
    const translatedLanguageLabel = document.getElementById('translated-language-label');
    const copyExtractedBtn = document.getElementById('copy-extracted');
    const copyTranslatedBtn = document.getElementById('copy-translated');
    const copiedExtractedFeedback = document.getElementById('copied-extracted-feedback');
    const copiedTranslatedFeedback = document.getElementById('copied-translated-feedback');
    const currentYearSpan = document.getElementById('current-year');

    let selectedImageFile = null;
    let imagePreviewUrl = null;
    let extractedHindiText = '';
    let translatedText = '';
    let targetLanguage = targetLanguageSelect.value;
    let isLoading = false;

    // Set current year for copyright
    currentYearSpan.textContent = new Date().getFullYear();

    // Hide initial elements
    imagePreviewContainer.style.display = 'none';
    errorMessageDiv.style.display = 'none';
    spinner.style.display = 'none';
    copyExtractedBtn.style.display = 'none';
    copyTranslatedBtn.style.display = 'none';

    // Function to show/hide loading state
    const setLoading = (loading) => {
        isLoading = loading;
        if (isLoading) {
            processImageBtn.disabled = true;
            spinner.style.display = 'inline-block';
            buttonText.textContent = 'Processing...';
        } else {
            processImageBtn.disabled = !selectedImageFile;
            spinner.style.display = 'none';
            buttonText.textContent = 'Process Image';
        }
    };

    // Function to display error messages
    const setErrorMessage = (message) => {
        if (message) {
            errorTextSpan.textContent = message;
            errorMessageDiv.style.display = 'block';
        } else {
            errorMessageDiv.style.display = 'none';
            errorTextSpan.textContent = '';
        }
    };

    // Helper to convert Data URL to plain base64
    const dataURLtoBase64 = (dataurl) => {
        return dataurl.split(',')[1];
    };

    // Function to handle copying text to clipboard
    const handleCopyToClipboard = (text, feedbackElement) => {
        try {
            navigator.clipboard.writeText(text).then(() => {
                feedbackElement.style.opacity = '1';
                feedbackElement.style.transform = 'translateX(-50%) translateY(-5px)';
                setTimeout(() => {
                    feedbackElement.style.opacity = '0';
                    feedbackElement.style.transform = 'translateX(-50%) translateY(0)';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text using Clipboard API: ', err);
                // Fallback for older browsers or insecure contexts
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                feedbackElement.style.opacity = '1';
                feedbackElement.style.transform = 'translateX(-50%) translateY(-5px)';
                setTimeout(() => {
                    feedbackElement.style.opacity = '0';
                    feedbackElement.style.transform = 'translateX(-50%) translateY(0)';
                }, 2000);
            });
        } catch (err) {
            console.error('Failed to copy text: ', err);
            setErrorMessage('Failed to copy text to clipboard.');
        }
    };


    // Event Listener for image file selection
    imageUpload.addEventListener('change', (e) => {
        selectedImageFile = e.target.files[0];
        setErrorMessage(''); // Clear error when a new file is selected
        extractedHindiTextDiv.innerHTML = '<p class="placeholder-text">No Hindi text extracted yet. Upload an image and click "Process Image".</p>';
        translatedTextDiv.innerHTML = '<p class="placeholder-text">Translated text will appear here.</p>';
        copyExtractedBtn.style.display = 'none';
        copyTranslatedBtn.style.display = 'none';

        if (selectedImageFile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                imagePreviewUrl = reader.result;
                imagePreview.src = imagePreviewUrl;
                imagePreviewContainer.style.display = 'block';
                processImageBtn.disabled = false; // Enable button once image is selected
            };
            reader.readAsDataURL(selectedImageFile);
        } else {
            imagePreviewUrl = null;
            imagePreview.src = '';
            imagePreviewContainer.style.display = 'none';
            processImageBtn.disabled = true; // Disable button if no image
        }
    });

    // Event Listener for target language selection
    targetLanguageSelect.addEventListener('change', (e) => {
        targetLanguage = e.target.value;
        translatedLanguageLabel.textContent = targetLanguage === 'en' ? 'English' : 'Bengali';
    });

    // Event Listener for Process Image button
    processImageBtn.addEventListener('click', async () => {
        if (!selectedImageFile) {
            setErrorMessage('Please select an image first.');
            return;
        }

        setLoading(true);
        setErrorMessage('');
        extractedHindiTextDiv.innerHTML = ''; // Clear previous text
        translatedTextDiv.innerHTML = ''; // Clear previous text
        copyExtractedBtn.style.display = 'none';
        copyTranslatedBtn.style.display = 'none';

        try {
            const base64ImageData = dataURLtoBase64(imagePreviewUrl);

            // --- Step 1: Extract Hindi text using Gemini API (Image Understanding) ---
            const ocrPrompt = "Extract all Hindi text from this image. Only provide the Hindi text, nothing else.";
            const ocrPayload = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: ocrPrompt },
                            {
                                inlineData: {
                                    mimeType: selectedImageFile.type,
                                    data: base64ImageData
                                }
                            }
                        ]
                    }
                ],
            };

            
            const apiKey = "GEMINI_API_KEY";
            const ocrApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const ocrResponse = await fetch(ocrApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ocrPayload)
            });

            const ocrResult = await ocrResponse.json();

            if (ocrResult.candidates && ocrResult.candidates.length > 0 &&
                ocrResult.candidates[0].content && ocrResult.candidates[0].content.parts &&
                ocrResult.candidates[0].content.parts.length > 0) {
                extractedHindiText = ocrResult.candidates[0].content.parts[0].text;
                extractedHindiTextDiv.innerHTML = `<p>${extractedHindiText}</p>`;
                copyExtractedBtn.style.display = 'inline-block';
            } else {
                setErrorMessage('Failed to extract Hindi text. This might be due to low-quality image, blurry text, or no Hindi text detected. Please try another image or ensure it contains clear Hindi text.');
                setLoading(false);
                return;
            }

            // --- Step 2: Translate the extracted Hindi text using Gemini API (Text Generation) ---
            if (extractedHindiText) {
                const translationPrompt = `Translate the following Hindi text into ${targetLanguage === 'en' ? 'English' : 'Bengali'}: \n\n"${extractedHindiText}"`;
                const translationPayload = {
                    contents: [{ role: "user", parts: [{ text: translationPrompt }] }],
                };

                const translationApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

                const translationResponse = await fetch(translationApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(translationPayload)
                });

                const translationResult = await translationResponse.json();

                if (translationResult.candidates && translationResult.candidates.length > 0 &&
                    translationResult.candidates[0].content && translationResult.candidates[0].content.parts &&
                    translationResult.candidates[0].content.parts.length > 0) {
                    translatedText = translationResult.candidates[0].content.parts[0].text;
                    translatedTextDiv.innerHTML = `<p>${translatedText}</p>`;
                    copyTranslatedBtn.style.display = 'inline-block';
                } else {
                    setErrorMessage('Failed to translate text. The translation service might be unavailable or unable to process the extracted text. Please try again.');
                }
            } else {
                setErrorMessage('No Hindi text was extracted to translate.');
            }

        } catch (error) {
            console.error('Error processing image:', error);
            setErrorMessage('An unexpected error occurred during processing. Please check your network connection or try again later.');
        } finally {
            setLoading(false);
        }
    });

    // Event listeners for copy buttons
    copyExtractedBtn.addEventListener('click', () => {
        handleCopyToClipboard(extractedHindiText, copiedExtractedFeedback);
    });

    copyTranslatedBtn.addEventListener('click', () => {
        handleCopyToClipboard(translatedText, copiedTranslatedFeedback);
    });
});
