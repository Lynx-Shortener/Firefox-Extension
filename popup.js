let currentPage = 0;
let remaining;

let settings = {}

const saveValues = () => {
    chrome.storage.local.set(settings);
}

const getValues = async () => {
    settings = await chrome.storage.local.get(["domain", "secret"]);
    const settingsPage = document.getElementById("settings-page");

    [...settingsPage.querySelectorAll("input")].forEach((setting) => {
        setting.value = settings[setting.getAttribute("name")] || "";
        console.log(settings)
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

const appendLinks = (links) => {
    const linkTable = document.getElementById("links-table");
    links.forEach((link) => {
        const linkElement = document.createElement("tr");
        linkElement.classList.add("link");

        const linkDate = document.createElement("td");
        linkDate.classList.add("link-date");
        linkDate.innerText = formatDate(link.creationDate);
        linkElement.appendChild(linkDate);

        const linkSlug = document.createElement("td");
        linkSlug.classList.add("link-slug");
        linkSlug.innerText = link.slug;
        linkElement.appendChild(linkSlug);

        const linkDestination = document.createElement("td");
        linkDestination.classList.add("link-destination");
        linkDestination.innerText = link.destination;
        linkElement.appendChild(linkDestination);

        const linkActions = document.createElement("td");
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

            linkActions.appendChild(actionElement);
        })

        linkElement.appendChild(linkActions);

        linkTable.appendChild(linkElement);
    })

}

const loadLinks = async () => {
    const query = new URLSearchParams({
        pagesize: 1,
        page: 0,
        search: "",
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

    console.log(links);

    appendLinks(links.result.links);

    remaining = links.result.remaining;
}

const init = async () => {
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