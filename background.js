const getValues = () => {
    return new Promise ((resolve, reject) => {
        chrome.storage.sync.get(["domain", "secret"], (data) => {
            resolve(data)
        })
    })
}

chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
        id: "lynx-create-link",
        title: "Create a short link of this page",
        contexts: ["page"]
    })

    const createAlert = (id, text) => {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "assets/favicon-32x32.png",
            title: "Lynx",
            message: text
        });
    }

    const createLink = async (destination) => {        
        const settings = await getValues();

        if (!settings.domain || settings.domain == "") {
            createAlert("invalid-domain", "Domain has not been set.")
        }
        if (!settings.secret || settings.secret == "") {
            createAlert("invalid-secret", "Secret has not been set.")
        }

        const response = await fetch(`${settings.domain}/api/link`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": settings.secret
            },
            body: JSON.stringify({
                slug: null,
                destination
            })
        });

        const data = await response.json();

        if (!data.success) return createAlert("link-creation-failure", data.message)

        const link = `${settings.domain}/${data.result.slug}`;

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, 
                {
                    message: "copyText",
                    textToCopy: link 
                }, function(response) {})
        })
    }

    const handleContextMenuClick = (e) => {
        const destination = e.pageUrl;
        switch (e.menuItemId) {            
            case "lynx-create-link":
                createLink(destination);
                break;
        }
    }
    
    chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
})

