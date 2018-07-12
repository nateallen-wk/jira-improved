function print(a, ...b) {
    // console.log(`wCustomize:`, a , ...b);
}

let issueKeyToLinksMap = new Map();
function updateTicketWithPullRequestLinks(issueCard, links) {
    var issueKey = issueCard.dataset.issueKey;
    var ghLinks = issueCard.querySelector('.ghx-pull-requests');
    if (!ghLinks) {
        ghLinks = document.createElement('div');
        issueCard.appendChild(ghLinks);
    } else {
        ghLinks.innerHTML = '';
    }
    ghLinks.className = 'ghx-pull-requests';
    ghLinks.style.position = 'absolute';
    ghLinks.style.width = '28px';
    ghLinks.style.bottom = '8px';
    ghLinks.style.left = '8px';

    for (var link of links) {
        var url = link.url.toString();
        if (url && url.indexOf('/pull/') > 0 && url.indexOf('github.com/') > 0) {
            var a = document.createElement('a');
            ghLinks.appendChild(a);
            a.href = link.url;
            a.target = '_blank';
            // stop click propogation to prevent Jira from opening the side panel
            a.addEventListener('click', function (ev) {
                ev.stopPropagation();
            }, true);
            var img = document.createElement('img');
            a.appendChild(img);
            img.title = link.summary;
            var icon = link.icon['url16x16'];
            if (icon) {
                icon = icon.split('/').pop();
            } else {
                icon = 'gh_link_merged.png';
            }
            img.src = chrome.extension.getURL(`img/${icon}`);
            img.style.width = '22px';
            img.style.height = '22px';
        }
    }
}

function updateTicket(issueCard) {
    var issueKey = issueCard.dataset.issueKey;
    let entry = issueKeyToLinksMap.get(issueKey);
    if (entry) {
        if (entry.fetching) {
            print(`already fetching ${issueKey}`);
            return;
        }
        if (Date.now() - entry.time < (3/*minutes*/ * 60/*seconds per minute*/ * 1000/*ms per second*/) ) {
            print(`cache hit ${issueKey}`);
            updateTicketWithPullRequestLinks(issueCard, entry.links);
            return;
        }
        print(`cache hit, but too stale ${issueKey}`);
    }
    print(`fetching PR links for ${issueKey}`);
    issueKeyToLinksMap.set(issueKey, {
        time: Date.now(),
        links: null,
        fetching: true
    });
    fetch(`https://jira.atl.workiva.net/rest/api/latest/issue/${issueKey}/remotelink`, { credentials: 'include' })
        .then(toJson)
        .then((jsonList) => jsonList.map((j) => j.object))
        .then(function (links) {
            print(`freshening cache for ${issueKey}`);
            issueKeyToLinksMap.set(issueKey, {
                time: Date.now(),
                links: links,
                fetching: false
            });
            updateTicketWithPullRequestLinks(issueCard, links);
        }).catch((reason) => {
            console.error(reason);
        });
}

function intersectionChanged(entries, observer) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            updateTicket(entry.target);
            print(`Intersecting: ${entry.target}`);
        }
    });
}

let issueMap = new Set();

function observeTickets() {
    let issues = document.querySelectorAll('.ghx-issue');
    print(issues);
    let io = new IntersectionObserver(intersectionChanged);
    issues.forEach((issue) => {
        var issueKey = issue.dataset.issueKey;
        print(`issueKey ${issueKey}`);
        
        if (!issueMap.has(issueKey)) {
            issueMap.add(issueKey);
            io.observe(issue);
            print('observing ',issueKey);
        }
    });
}

function toJson(response) {
    var contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return response.json();
    }
    throw new TypeError("Oops, we haven't got JSON!");
}


var _lastMutationTimeout;

function handleMutation() {
    if (_lastMutationTimeout) {
        return;
    }
    _lastMutationTimeout = setTimeout(function () {
        print('handling mutation');
        observeTickets();
        _lastMutationTimeout = null;
    }, 1000);
}

function renameWAPlog() {
    var projectLink = document.querySelector(".project-title a").href;
    
    if (projectLink === "https://jira.atl.workiva.net/projects/WAP/summary") {
        var backlogNavTitle = document.querySelector('.aui-nav-item-label[title=Backlog]');
        backlogNavTitle.innerText = "WAPlog";
    }
}

function init() {
    var mo = new MutationObserver(handleMutation);
    mo.observe(document.body, { attributes: true, childList: true });
    handleMutation();
    renameWAPlog();
}
function waitToInit() {
    if (document.readyState == 'complete' && document.body) {
        setTimeout(init, 200);
    } else {
        setTimeout(waitToInit, 200);
    }
}
waitToInit();
