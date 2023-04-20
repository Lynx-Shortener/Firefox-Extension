chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.message === "copyText") {
            navigator.clipboard.writeText(request.textToCopy);
            sendResponse(true)
        }
    }
);