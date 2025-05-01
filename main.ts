import "inter-ui/inter.css";
import "./styles.css";
import { decrypt, encrypt, keyFromPassword } from "./cryptoapi";
import posthog from 'posthog-js'

posthog.init('phc_FeriuDBIyqt9KKKHXDBSebZhzan9IPZzHjuN6JwrVzZ',
    {
        api_host: 'https://us.i.posthog.com',
        session_recording: {
            recordBody: true,
            collectFonts: true,
        },
        opt_out_capturing_by_default: true,
    }
)

const cookieBanner = document.getElementById("cookie-consent") as HTMLElement;
const acceptButton = document.getElementById("accept-cookies") as HTMLButtonElement;
const rejectButton = document.getElementById("decline-cookies") as HTMLButtonElement;

const isOptedIn = localStorage.getItem('posthog-opt-in');
if (isOptedIn === 'true') {
    posthog.opt_in_capturing();
    cookieBanner.classList.add("hidden");
} else if (isOptedIn === 'false') {
    cookieBanner.classList.add("hidden");
} else {
    cookieBanner.classList.remove("hidden");
}
acceptButton.addEventListener("click", () => {
    posthog.opt_in_capturing();
    localStorage.setItem('posthog-opt-in', 'true');
    cookieBanner.classList.add("hidden");
});
rejectButton.addEventListener("click", () => {
    posthog.opt_out_capturing();
    localStorage.setItem('posthog-opt-in', 'false');
    cookieBanner.classList.add("hidden");
});



posthog.onFeatureFlags(() => {
    if (posthog.isFeatureEnabled('centered')) {
        document.documentElement.classList.add('centered');
    }
    if (posthog.isFeatureEnabled('blue-dark')) {
        document.documentElement.classList.add('blue-dark');
    }
});

function alert(message: string, title: string = "Alert", buttonLabel: string = "Close"): Promise<void> {

    const alertBox = document.createElement("dialog");
    alertBox.className = "alert";
    alertBox.innerText = message;
    document.body.appendChild(alertBox);
    const titleElement = document.createElement("h2");
    titleElement.innerText = title;
    titleElement.className = "alert-title";
    alertBox.prepend(titleElement);
    const closeButton = document.createElement("button");
    closeButton.innerText = buttonLabel;
    closeButton.className = "alert-close";
    closeButton.addEventListener("click", () => {
        alertBox.close();
    });
    alertBox.appendChild(closeButton);
    const returnValue = new Promise<void>((resolve) => {
        alertBox.showModal();
        alertBox.addEventListener("close", () => {
            document.body.removeChild(alertBox);
            resolve();
        });
    });
    return returnValue;
}

function handleCreate(e: SubmitEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const url = data.get("link") as string;
    const password = data.get("password") as string;
    posthog.capture('create-link')
    const key = keyFromPassword(password);
    key.then((key) => {
        encrypt(url, key).then((encryptedLink) => {
            const result = document.getElementById("secure-link") as HTMLElement;
            const url = new URL(location.href);
            const params = new URLSearchParams(url.search);
            params.set("to", encryptedLink);
            result.innerText = location.origin + location.pathname + "?" + params.toString();
            document.getElementById("secure-link-result")!.hidden = false;
            document.getElementById("create-secure-link")!.hidden = false;
        });
    }).catch((error) => {
        console.error("Error generating key:", error);
        alert("Error generating key. Please try again.", "Error", "Ok");
    });
}

document.getElementById("create-link-form")?.addEventListener("submit", handleCreate);
document.getElementById("copy-link")?.addEventListener("click", () => {
    const result = document.getElementById("secure-link") as HTMLElement;
    navigator.clipboard.writeText(result.innerText).then(() => {
        alert("Link copied to clipboard!", "Success", "Ok");
    }).catch((error) => {
        console.error("Error copying link:", error);
        alert("Error copying link. Please try again.", "Error", "Ok");
    });
});
document.getElementById("copy-unlocked-link")?.addEventListener("click", () => {
    const result = document.getElementById("unlocked-link") as HTMLAnchorElement;
    navigator.clipboard.writeText(result.href).then(() => {
        alert("Link copied to clipboard!", "Success", "Ok");
    }).catch((error) => {
        console.error("Error copying link:", error);
        alert("Error copying link. Please try again.", "Error", "Ok");
    });
})

document.getElementById("create-secure-link")!.hidden = false;
if (location.search) {
    const url = new URL(location.href);
    const params = new URLSearchParams(url.search);
    const encryptedLink = params.get("to");
    if (encryptedLink) {
        document.getElementById("secure-link-form")!.hidden = false;
        document.getElementById("create-secure-link")!.hidden = true;
        document.getElementById("secure-link-result")!.hidden = true;
        document.getElementById("unlock-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const data = new FormData(form);
            const password = data.get("password") as string;
            const key = keyFromPassword(password);
            posthog.capture('unlock-link')
            key.then((key) => {
                decrypt(encryptedLink, key).then((decryptedLink) => {
                    console.log("Decrypted link:", decryptedLink);
                    if (!decryptedLink) {
                        alert("Invalid password. Please try again.");
                        return;
                    }
                    const linkElement = document.getElementById("unlocked-link") as HTMLAnchorElement;
                    linkElement.href = decryptedLink;
                    linkElement.innerText = decryptedLink;
                    document.getElementById("unlock-result")!.hidden = false;
                    document.getElementById("unlock-form")!.hidden = true;
                    (document.querySelector("#secure-link-form > h2") as HTMLHeadingElement).hidden = true;
                    document.getElementById("open-secretly")?.addEventListener("click", () => {
                        const secretWindow = window.open('about:blank', '_blank');
                        if (secretWindow) {
                            secretWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                    <head>
                                        <title>Error Loading</title>
                                        <!-- Definitely failed to load -->
                                        <style>
                                            * {
                                                margin: 0;
                                                padding: 0;
                                                box-sizing: border-box;
                                            }
                                        </style>
                                    </head>
                                    <body>
                                        <iframe src="${decryptedLink}" style="width: 100vw; height: 100vh; border: none;"></iframe>
                                    </body>
                                </html>
                            `);
                        } else {
                            alert("Please allow popups for this site to open the link in a new window.", "Popup Blocked", "Ok");
                        }
                    });
                }).catch((error) => {
                    console.error("Error decrypting link:", error);
                    alert("Error decrypting link. Please check your password and try again.");
                });
            }).catch((error) => {
                console.error("Error generating key:", error);
                alert("Error generating key. Please try again.");
            });
        });
    }
}
