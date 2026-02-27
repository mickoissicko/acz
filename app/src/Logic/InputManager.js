/* handles user input for the manga viewer */
let CurrentPageNumber = 1;
let TotalPages = 0;

function InitialiseControls() {
    let ViewportElement = document.getElementById("MangaViewport");

    /* double click to advance page */
    ViewportElement.addEventListener("dblclick", function() {
        ChangePage(1);
    });

    /* keyboard navigation */
    window.addEventListener("keydown", function(Event) {
        /* prevent default scrolling behaviour */
        if (Event.key === "ArrowUp" || Event.key === "ArrowDown") {
            Event.preventDefault();
        }

        if (Event.key === "ArrowUp") {
            ChangePage(-1); /* previous page */
        } else if (Event.key === "ArrowRight" || Event.key === " ") {
            ChangePage(1); /* next page */
        }
    });
}

function ChangePage(Direction) {
    let NewPage = CurrentPageNumber + Direction;
    
    if (NewPage >= 1) {
        CurrentPageNumber = NewPage;
        /* update the image source from the server */
        UpdateReaderDisplay(); 
    }
}