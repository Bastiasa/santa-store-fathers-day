/**@type {HTMLInputElement} */
const imageInput = document.getElementById("image-input");
const sampleImage = document.getElementById("sample-image");


const emailInput = document.getElementById("email-input");
const uploadLabel = document.getElementById("upload-image");
const purchaseButton = document.getElementById("purchase-button");

const beforeContinueBackground = document.getElementById("background-before-continue-form");
const beforeContinueForm = document.getElementById("before-continue");
const beforeContinueDrawImage = document.getElementById("before-continue-draw-image");
const beforeContinueSubmit = beforeContinueForm.querySelector("input[type=submit]");

const loadingOverlay = document.getElementById("loading-overlay");


var currentImageBlob = null;
purchaseButton.disabled = true;

function plopSampleImage() {
    sampleImage.animate([
        {
            "transform": "translateY(50px)",
            "opacity":"0"
        },
        {
            "transform": "translateY(0)",
            "opacity": "1"
        }
    ], {
        "duration": 300
    }).play();
}

/**@returns {string?} */
async function obtainCurrentImageBase64() {
    if (currentImageBlob instanceof Blob) {
        const resultPromise = new Promise((resolve, reject) => {
            const fileReader = new FileReader();

            fileReader.onloadend = () => {
                resolve(fileReader.result)
            }

            fileReader.onerror = reject;

            fileReader.readAsArrayBuffer(currentImageBlob);
        });

        const result = await resultPromise;

        if (typeof result == "string") {
            return result;
        }
    }

    return null;
}

function bounceElement(element, duration=250, iterations = 3) {
    const animation =         element.animate([
            {
                "transform":"scale(1)"
            },

            {
                "transform": "scale(1.1)"
            },

            {
                "transform":"scale(1)"
            }
    ], { "duration": duration, "iterations":iterations })
    
    return animation;
}

bounceElement(uploadLabel);

function setCurrentBlobByFile(file) {
    file.arrayBuffer().then(buffer => {
        
        if (buffer.byteLength / 1000000 > 10) {
            window.alert("La imagen es mayor a 10 Megabytes.");
            return;
        }

        currentImageBlob = new Blob([buffer], { type: file.type });
        sampleImage.src = URL.createObjectURL(currentImageBlob);
        beforeContinueDrawImage.src = sampleImage.src;

        plopSampleImage();

        purchaseButton.disabled = false;
        bounceElement(purchaseButton);

    });
}

imageInput.addEventListener("change", (e) => {
    const uploadedFile = (imageInput.files[0]);

    if (uploadedFile) {
        setCurrentBlobByFile(uploadedFile);
    }
});

const dragOverlay = document.getElementById('drag-overlay');

document.body.addEventListener("dragenter", (e) => {
    if (validateDragging(e)) {
        dragOverlay.classList.remove("hidden");
    }
});

function hideDragOverlay() {
    dragOverlay.classList.add("hidden");
}

function validateDragging(e) {
    if (e.dataTransfer.items.length < 1 || e.dataTransfer.items.length > 1) {
        return false;
    }

    for (const item of e.dataTransfer.items) {
        if (!item.type.startsWith("image")) {
            return false;
        }
    }

    return true;
}


['dragleave', 'drop'].forEach(eventName => document.body.addEventListener(eventName, hideDragOverlay));

document.body.addEventListener("dragover", (e) => {
    e.preventDefault();

    if (validateDragging(e)) {
        e.dataTransfer.dropEffect = "move";
    } else {
        e.dataTransfer.dropEffect = "none";
    }

});

document.body.addEventListener("drop", (e) => {
    e.preventDefault();
    setCurrentBlobByFile(e.dataTransfer.files[0]);
});

/**
 * 
 * @param {keyof HTMLElementTagNameMap} tagName 
 * @param {object} properties 
 * @returns {HTMLElement}
 */
function createElement(tagName, properties = {}) {
    const element = document.createElement(tagName);

    for (const propertyName in properties) {

        try {
            const propertyValue = properties[propertyName];
            element[propertyName] = propertyValue;
        } catch (e) {
            console.warn("The element "+tagName+" does not have the property "+propertyName+".");
        }
    }

    return element;
}


function generateReferenceCode() {
    const todayDate = (new Date());
    const baseDate = new Date(2024, 5, 7, 12+8, 25);

    return  (sha256((todayDate - baseDate).toString())).substring(0, 12).toUpperCase();
}

purchaseButton.addEventListener("click", (e) => {
    beforeContinueBackground.classList.remove("hidden");
    bounceElement(beforeContinueSubmit)
})

beforeContinueForm.addEventListener("submit", async (event) => {

    event.preventDefault();
    loadingOverlay.classList.remove("hidden");

    const merchantId = "1003137";
    const accountId = "1011839";
    const apiKey = "ey66PBt5QOF509eQad0IVOpNS8";
    const amount = "48000";
    const referenceCode = generateReferenceCode();

    const signature = sha256(`${apiKey}~${merchantId}~${referenceCode}~${amount}~COP`);

    async function uplodaFile() {
        const endpoint = "https://content.dropboxapi.com/2/files/upload";
        const dropboxArgs = {
            autorename: false,
            mode: "add",
            mute: false,
            path: "/"+referenceCode +"."+ currentImageBlob.type.split("/")[1],

        }

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": "Bearer sl.B2w7AOHFRaei5DyOvb9YMPxSbJMMn1Pv3faZesxUt9o-4dAtKE6GgQqJvO6p2eE4I5fAuG0DYSyuqTCX1TT6qXefKk2y438z0bCHcnmWTGpV3JqGwt1-oEm_3mpR4All8EfNbvbrY0KC",
                "Content-Type": "application/octet-stream",
                "Dropbox-API-Arg": JSON.stringify(dropboxArgs)
            },

            body: currentImageBlob
        
        });

        return response.status;
    }

    let responseCodeResult = await uplodaFile();

    while (responseCodeResult !== 200) {
        responseCodeResult = await uplodaFile();
    }

    const beforeContinueData = new FormData(beforeContinueForm);

    const form = createElement("form", {
        "method": "post",
        "action": "https://checkout.payulatam.com/ppp-web-gateway-payu/"
    });

    const values = {
        "merchantId": merchantId,
        "accountId": accountId,
        "description": "Un regalo especial por el mes del padre.",
        "referenceCode": referenceCode,
        "amount": amount,
        "currency": 'COP',
        "signature": signature,
        "buyerEmail": beforeContinueData.get("user-email"),
        "buyerFullName":beforeContinueData.get("user-name"),
        "shippingCity": beforeContinueData.get("user-city"),
        "shippingCountry": "CO",
        "test": "0",
        "algorithmSignature": "sha256",
        "tax": "0",
        "taxReturnBase": "0",
        "additionalValue":"10000"
    }

    for (const valueName in values) {
        const value = values[valueName];
        const inputElement = createElement("input", {
            "type": "hidden",
            "name": valueName,
            "value": value
        });

        form.appendChild(inputElement);
    }

    const submitButton = createElement("input", { "type": "submit", "name":"Submit" });
    
    form.appendChild(submitButton);
    form.style.display = "none";

    document.body.appendChild(form);
    submitButton.click();
});