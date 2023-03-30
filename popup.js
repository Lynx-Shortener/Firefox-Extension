let currentPage = 0;
let pagesize = 10;
let itemsOnPage = 0;
let remaining = 0;
let totalPages = 0;

let settings = {}

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

const updateLinks = (links) => {
    const linkTable = document.getElementById("links-table");
    const existingLinks = linkTable.querySelectorAll(".link");
    [...existingLinks].forEach((link) => {
        link.remove();
    })
    links.forEach((link, index) => {
        const row = linkTable.insertRow(index + 1);
        row.classList.add("link");

        const linkDate = row.insertCell(0);
        linkDate.classList.add("link-date");
        linkDate.innerText = formatDate(link.creationDate);

        const linkSlug = row.insertCell(1);
        linkSlug.classList.add("link-slug");
        linkSlug.innerText = link.slug;

        const linkDestination = row.insertCell(2);
        linkDestination.classList.add("link-destination");
        linkDestination.innerText = link.destination;

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

}

const loadLinks = async () => {
    const query = new URLSearchParams({
        page: currentPage,
        pagesize,
        currentPage: 0,
        sortType: "1",
        sortField: "slug"
    }).toString()

    const response = await fetch(`${settings.domain}/api/link/list?${query}`, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": settings.secret
        }
    })

    const links = await response.json();

    updateLinks(links.result.links);

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
    await getValues();
    await loadLinks();

    document.getElementById("page-left").addEventListener("click", previousPage);
    document.getElementById("page-right").addEventListener("click", nextPage);
}

[...document.querySelectorAll("input")].forEach((input) => {
    input.addEventListener("change", () => {
        settings[input.getAttribute("name")] = input.value;
        saveValues();
    })
});

init();