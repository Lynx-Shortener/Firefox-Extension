let currentPage = 0;
let pagesize = 10;
let itemsOnPage = 0;
let remaining = 0;
let totalPages = 0;

let settings = {}

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
            linkElement.querySelector(".link-actions").remove();
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
                actionLink.appendChild(actionElement);
                linkActions.appendChild(actionLink);
            } else {
                linkActions.appendChild(actionElement);
            }

            if (action.id == "delete") {
                actionElement.addEventListener("click", () => deleteLink(link, row));
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

    await getValues();
    await loadLinks();
}

[...document.querySelectorAll("input")].forEach((input) => {
    input.addEventListener("change", () => {
        settings[input.getAttribute("name")] = input.value;
        saveValues();
    })
});

init();