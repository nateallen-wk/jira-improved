function updateTicketsWithPullRequestLinks() {
    var issueCards = document.querySelectorAll('.ghx-issue');
    issueCards.forEach(function (issueCard) {
        var issueKey = issueCard.dataset.issueKey;
        fetch(`https://jira.atl.workiva.net/rest/api/latest/issue/${issueKey}/remotelink`, { credentials: 'include' })
            .then(toJson)
            .then((jsonList) => jsonList.map((j) => j.object))
            .then(function (links) {
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
            });
    }, this);
}

function toJson(response) {
    var contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return response.json();
    }
    throw new TypeError("Oops, we haven't got JSON!");
}

var _lastMutationTimeout;

function handleMutation(){
    if (_lastMutationTimeout) {
        return;
    }
    _lastMutationTimeout = setTimeout( function() {
        updateTicketsWithPullRequestLinks();
        _lastMutationTimeout = null;
    } , 1000);
}

function init() {
    var mo = new MutationObserver(handleMutation);
    mo.observe(document.body, { attributes: true, childList: true });
    updateTicketsWithPullRequestLinks();
}
function waitToInit() {
    if (document.readyState == 'complete') {
        init();
    } else {
        setTimeout(waitToInit, 100);
    }
}
waitToInit();