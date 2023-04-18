let currentPage = 0;
let pagesize = 10;
let itemsOnPage = 0;
let remaining = 0;
let totalPages = 0;
let currentURL = "";

let settings = {}

const createLink = async (destination, slug) => {        
    if (!settings.domain || settings.domain == "") {
        alert("Domain has not been set.")
    }
    if (!settings.secret || settings.secret == "") {
        alert("Secret has not been set.")
    }

    const response = await fetch(`${settings.domain}/api/link`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": settings.secret
        },
        body: JSON.stringify({
            slug,
            destination
        })
    });

    const data = await response.json();

    if (!data.success) return alert(data.message)

    const link = `${settings.domain}/${data.result.slug}`;

    navigator.clipboard.writeText(link);

    loadPage("links");
}

const loadPage = (newPage) => {
    const pages = [
        {
            display: "block",
            name: "links"
        },
        {
            display: "grid",
            name: "settings"
        },
        {
            display: "grid",
            name: "new-link"
        }
    ]

    pages.forEach((page) => {
        document.getElementById(`${page.name}-page`).style.display = page.name === newPage ? page.display : "none";
    })
    
    Array.from(document.getElementsByClassName("header-link")).forEach((headerLink) => {
        headerLink.setAttribute("active", headerLink.dataset.page == newPage);
    });

    switch (newPage) {
        case "new-link":
            chrome.tabs.query({active: true}, tabs => {
                console.log(tabs)
                if (tabs[0]) {
                    currentURL = tabs[0].url;

                    const destinationInput = document.getElementById("new-link-destination");
                    destinationInput.value = currentURL;
                }
            });
        case "links":
            currentPage = 0;
            pagesize = 10;
            itemsOnPage = 0;
            remaining = 0;
            totalPages = 0;
            setLoading(true);
            loadLinks();
            
    }
}

const setLoading = (loading) => {
    document.querySelector(".links-table").style.display = loading ? "none" : "block";
    document.querySelector(".pagination").style.display = loading ? "none" : "flex";

    document.querySelector(".loader").style.display = loading ? "grid" : "none";
}

const setError = (error, text) => {
    document.querySelector(".links-table").style.display = error ? "none" : "block";
    document.querySelector(".pagination").style.display = error ? "none" : "flex";

    document.querySelector(".error").style.display = error ? "block" : "none";

    if (text) {
        document.getElementById("error-text").innerText = text;
    }
}

const saveValues = () => {
    chrome.storage.local.set(settings);
}

const getValues = async () => {
    settings = await chrome.storage.local.get(["domain", "secret"]);
    const settingsPage = document.getElementById("settings-page");

    [...settingsPage.querySelectorAll("input")].forEach((setting) => {
        setting.value = settings[setting.getAttribute("name")] || "";
    })
}

const formatDate = (date) => {
    const ordinal_suffix_of = (i) => {
        var j = i % 10,
            k = i % 100;
        if (j == 1 && k != 11) {
            return i + "st";
        }
        if (j == 2 && k != 12) {
            return i + "nd";
        }
        if (j == 3 && k != 13) {
            return i + "rd";
        }
        return i + "th";
    }

    date = new Date(date);
    const day = ordinal_suffix_of(date.getDate());
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();

    return `${month} ${day}, ${year}`;
}

const deleteLink = async (link, linkElement) => {
    const confirmDelete = confirm(`Are you sure you want to delete ${link.slug}?`);
    if (confirmDelete) {
        const response = await fetch(`${settings.domain}/api/link`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": settings.secret
            },
            body: JSON.stringify({
                ids: [link.id]
            })
        });

        const data = await response.json();

        if (data.success) {
            linkElement.classList.add("link-deleted");
            Array.from(linkElement.querySelectorAll(".link-action")).forEach((button) => {
                button.setAttribute("disabled", true);
            })
            document.getElementById("link-action-anchor").removeAttribute("href");
        } else {
            alert(data.message);
        }
    }
}

const previousPage = () => {
    if (currentPage == 0) return;
    currentPage--;
    loadLinks();
}

const nextPage = () => {
    if (currentPage == totalPages) return;
    currentPage++;
    loadLinks();
}

const loadLinks = async () => {
    setLoading(true);
    const query = new URLSearchParams({
        page: currentPage,
        pagesize,
        sortType: "-1",
        sortField: "creationDate"
    }).toString()

    const response = await fetch(`${settings.domain}/api/link/list?${query}`, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": settings.secret
        }
    }).catch((e) => {
        setLoading(false);
        setError(true, e);
    })

    const links = await response.json();

    if (!links.success) {
        setError(true, links.message);
        return;
    }

    const linkTable = document.getElementById("links-table");
    const existingLinks = linkTable.querySelectorAll(".link");

    [...existingLinks].forEach((link) => {
        link.remove();
    })

    links.result.links.forEach((link, index) => {
        const row = linkTable.insertRow(index + 1);
        row.classList.add("link");

        const linkDate = row.insertCell(0);
        linkDate.classList.add("link-date");
        linkDate.setAttribute("title", new Date(link.creationDate).toISOString().replaceAll(/(T|Z)/g," ").trim());
        linkDate.innerText = formatDate(link.creationDate);

        const linkSlug = row.insertCell(1);
        linkSlug.classList.add("link-slug");
        linkSlug.setAttribute("title", link.slug);

        const linkSlugLink = document.createElement("a");
        linkSlugLink.href = `${settings.domain}/${link.slug}`;
        linkSlugLink.setAttribute("target","_blank");
        linkSlugLink.appendChild(document.createTextNode(link.slug));
        linkSlug.appendChild(linkSlugLink)

        const linkDestination = row.insertCell(2);
        linkDestination.classList.add("link-destination");
        
        const linkDestinationText = document.createElement("div");
        linkDestinationText.innerText = link.destination;
        linkDestinationText.style.width = "12rem";
        linkDestinationText.setAttribute("title", link.destination);
        linkDestination.appendChild(linkDestinationText);

        const linkActions = row.insertCell(3);
        linkActions.classList.add("link-actions");
        const actions = [
            {
                "id": "edit",
                "icon": "pencil-solid.svg"
            },
            {
                "id": "delete",
                "icon": "trash-can-solid.svg"
            }
        ]

        actions.forEach((action) => {
            const actionElement = document.createElement("div");
            actionElement.id = `action-${action.id}`;
            actionElement.classList.add("link-action");
            const image = document.createElement("img");
            image.src = chrome.runtime.getURL(`assets/icons/${action.icon}`);
            actionElement.appendChild(image);
            if (action.id == "edit") {
                const actionLink = document.createElement("a");
                actionLink.href = `${settings.domain}/dash/overview?edit=${link.id}`;
                actionLink.setAttribute("target","_blank");
                actionLink.id = "link-action-anchor";
                actionLink.appendChild(actionElement);
                linkActions.appendChild(actionLink);
            } else {
                linkActions.appendChild(actionElement);
            }

            if (action.id == "delete") {
                actionElement.addEventListener("click", (e) => {
                    if (e.target.getAttribute("disabled")) return;
                    deleteLink(link, row);
                });
            }
        });
    })

    setLoading(false);

    remaining = links.result.remaining;

    if (currentPage == 0) {
        totalPages = remaining;
    }

    let itemStart = (currentPage * pagesize) + 1;
    let itemEnd = itemStart + links.result.links.length - 1;

    document.getElementById("page-text").innerText = `Links ${itemStart} - ${itemEnd} (Page ${currentPage + 1}/${totalPages + 1})`;
    document.getElementById("page-left").setAttribute("disabled", currentPage == 0);
    document.getElementById("page-right").setAttribute("disabled", currentPage == totalPages);
}

const init = async () => {
    setLoading(true);

    document.getElementById("page-left").addEventListener("click", previousPage);
    document.getElementById("page-right").addEventListener("click", nextPage);
    document.getElementById("retry-button").addEventListener("click", () => {
        setError(false);
        loadLinks();
    })

    Array.from(document.getElementsByClassName("header-link")).forEach((headerLink) => {
        headerLink.addEventListener("click", () => {
            loadPage(headerLink.dataset.page);
        });
    });

    let dark;

    if (localStorage.getItem("dark") !== null) {
        dark = localStorage.getItem("dark") === "true";
    } else {
        dark = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) || false;
    }

    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    // Toggle Secret

    const toggleSecret = document.getElementById("toggle-secret");
    toggleSecret.addEventListener("click", () => {
        const secretInput = document.getElementById("secret-input");
        console.log(toggleSecret.dataset)
        toggleSecret.setAttribute("data-secretvisible", !(toggleSecret.dataset.secretvisible === "true"));
        secretInput.type = toggleSecret.dataset.secretvisible === "true" ? "text" : "password";
    })

    // New link

    const newLinkButton = document.getElementById("new-link-button");
    console.log(newLinkButton)
    newLinkButton.addEventListener("click", () => {
        let destination = document.getElementById("new-link-destination").value;
        let slug = document.getElementById("new-link-slug").value;
        createLink(destination, slug);
    })

    await getValues();
    loadPage("links");
}

[...document.querySelectorAll("input")].forEach((input) => {
    input.addEventListener("change", () => {
        settings[input.getAttribute("name")] = input.value;
        saveValues();
    })
});

init();
