
/* ============================================
   FAMILY TREE MANAGEMENT SYSTEM
============================================ */


/* ============================================
   1. DATABASE / LOCAL STORAGE
============================================ */

let members = [];

try {
    members = JSON.parse(
        localStorage.getItem("familyMembers") || "[]"
    );
} catch (error) {
    members = [];
}

function generateId() {
    return crypto.randomUUID();
}

function fullName(member) {
    return [
        member.firstName,
        member.middleName,
        member.lastName
    ].filter(Boolean).join(" ");
}

function findMember(id) {
    return members.find(member => member.id === id);
}

function saveData() {
    localStorage.setItem(
        "familyMembers",
        JSON.stringify(members)
    );

    updateDashboard();
    displayMembers();
    updateRelationshipOptions();
    displayTree();
}


/* ============================================
   2. AGE CALCULATION
============================================ */

function calculateAge(dob, dod = "") {

    if (!dob) return "";

    const birth = new Date(dob + "T00:00:00");

    const end = dod
        ? new Date(dod + "T00:00:00")
        : new Date();

    if (
        isNaN(birth.getTime()) ||
        isNaN(end.getTime()) ||
        end < birth
    ) {
        return "";
    }

    let age = end.getFullYear() - birth.getFullYear();

    if (
        end.getMonth() < birth.getMonth() ||
        (
            end.getMonth() === birth.getMonth() &&
            end.getDate() < birth.getDate()
        )
    ) {
        age--;
    }

    return age;
}

function updateAge() {

    const dob = document.getElementById("dob").value;
    const dod = document.getElementById("dod").value;

    document.getElementById("age").value =
        calculateAge(dob, dod);
}

document.getElementById("dob")
    .addEventListener("change", updateAge);

document.getElementById("dod")
    .addEventListener("change", updateAge);


/* ============================================
   3. NAVIGATION
============================================ */

function showSection(sectionId) {

    document.querySelectorAll("main section")
        .forEach(section => {
            section.classList.add("hidden");
        });

    const section = document.getElementById(sectionId);

    if (!section) return;

    section.classList.remove("hidden");

    if (sectionId === "dashboard") {
        updateDashboard();
    }

    if (sectionId === "members") {
        displayMembers();
    }

    if (sectionId === "addMember") {
        updateRelationshipOptions();
    }

    if (sectionId === "familyTree") {
        displayTree();
    }
}


/* ============================================
   4. PREVENT FAMILY RELATIONSHIP CYCLES
============================================ */

function createsParentCycle(memberId, parentId) {

    if (!parentId) return false;

    const visited = new Set();

    function check(id) {

        if (id === memberId) return true;

        if (!id || visited.has(id)) return false;

        visited.add(id);

        const person = findMember(id);

        if (!person) return false;

        return (
            check(person.fatherId) ||
            check(person.motherId)
        );
    }

    return check(parentId);
}


/* ============================================
   5. ADD / UPDATE MEMBER
============================================ */

document.getElementById("memberForm")
    .addEventListener("submit", function(event) {

        event.preventDefault();

        const id = document.getElementById("memberId").value;

        const dob = document.getElementById("dob").value;
        const dod = document.getElementById("dod").value;

        const fatherId =
            document.getElementById("fatherId").value;

        const motherId =
            document.getElementById("motherId").value;

        const spouseId =
            document.getElementById("spouseId").value;

        if (dod && dod < dob) {
            alert("Date of death cannot be before date of birth.");
            return;
        }

        if (
            id &&
            [fatherId, motherId, spouseId].includes(id)
        ) {
            alert("A member cannot be their own relative.");
            return;
        }

        if (fatherId && fatherId === motherId) {
            alert("Father and mother cannot be the same person.");
            return;
        }

        const relationships = [
            fatherId,
            motherId,
            spouseId
        ].filter(Boolean);

        if (relationships.some(
            relationId => !findMember(relationId)
        )) {
            alert("Please select valid relationships.");
            return;
        }

        if (
            createsParentCycle(id, fatherId) ||
            createsParentCycle(id, motherId)
        ) {
            alert("This relationship creates a family tree cycle.");
            return;
        }

        const member = {

            id: id || generateId(),

            firstName:
                document.getElementById("firstName").value.trim(),

            middleName:
                document.getElementById("middleName").value.trim(),

            lastName:
                document.getElementById("lastName").value.trim(),

            dob: dob,

            age: calculateAge(dob, dod),

            dod: dod,

            gender:
                document.getElementById("gender").value,

            occupation:
                document.getElementById("occupation").value.trim(),

            birthPlace:
                document.getElementById("birthPlace").value.trim(),

            address:
                document.getElementById("address").value.trim(),

            spouseName:
                document.getElementById("spouseName").value.trim(),

            fatherId: fatherId,
            motherId: motherId,
            spouseId: spouseId
        };

        // Remove previous reciprocal spouse link
        if (id) {

            const oldMember = findMember(id);

            if (
                oldMember &&
                oldMember.spouseId &&
                oldMember.spouseId !== spouseId
            ) {
                const oldSpouse = findMember(oldMember.spouseId);

                if (oldSpouse && oldSpouse.spouseId === id) {
                    oldSpouse.spouseId = "";
                }
            }
        }

        // Save member
        const index = members.findIndex(m => m.id === member.id);

        if (index >= 0) {
            members[index] = member;
        } else {
            members.push(member);
        }

        // Link spouse in both directions
        if (spouseId) {

            const spouse = findMember(spouseId);

            if (
                spouse &&
                spouse.spouseId &&
                spouse.spouseId !== member.id
            ) {
                const previousSpouse = findMember(spouse.spouseId);

                if (previousSpouse) {
                    previousSpouse.spouseId = "";
                }
            }

            if (spouse) {
                spouse.spouseId = member.id;
            }
        }

        saveData();

        resetForm();

        alert("Family member saved successfully!");

        showSection("members");
    });


/* ============================================
   6. RESET FORM
============================================ */

function resetForm() {

    document.getElementById("memberForm").reset();

    document.getElementById("memberId").value = "";

    document.getElementById("age").value = "";

    updateRelationshipOptions();
}


/* ============================================
   7. DASHBOARD
============================================ */

function updateDashboard() {

    document.getElementById("totalMembers").textContent =
        members.length;

    document.getElementById("livingMembers").textContent =
        members.filter(m => !m.dod).length;

    document.getElementById("deceasedMembers").textContent =
        members.filter(m => !!m.dod).length;
}


/* ============================================
   8. RELATIONSHIP DROPDOWNS
============================================ */

function updateRelationshipOptions() {

    const currentId =
        document.getElementById("memberId").value;

    const fields = [
        {
            id: "fatherId",
            label: "Select Father",
            gender: "Male"
        },
        {
            id: "motherId",
            label: "Select Mother",
            gender: "Female"
        },
        {
            id: "spouseId",
            label: "Select Spouse",
            gender: ""
        }
    ];

    fields.forEach(field => {

        const select = document.getElementById(field.id);

        const previousValue = select.value;

        select.innerHTML = "";

        const option = document.createElement("option");

        option.value = "";
        option.textContent = field.label;

        select.appendChild(option);

        members
            .filter(m => m.id !== currentId)
            .filter(m => {
                return !field.gender ||
                    !m.gender ||
                    m.gender === field.gender;
            })
            .forEach(member => {

                const opt = document.createElement("option");

                opt.value = member.id;
                opt.textContent = fullName(member);

                select.appendChild(opt);
            });

        select.value = previousValue;
    });
}


/* ============================================
   9. DISPLAY MEMBERS
============================================ */

function displayMembers() {

    const table = document.getElementById("memberTable");

    const search = (
        document.getElementById("search").value || ""
    ).toLowerCase();

    table.innerHTML = "";

    const filtered = members.filter(member => {

        return fullName(member)
            .toLowerCase()
            .includes(search);
    });

    filtered.forEach(member => {

        const row = document.createElement("tr");

        const spouse = findMember(member.spouseId);

        const values = [
            fullName(member),
            member.dob,
            calculateAge(member.dob, member.dod),
            member.occupation,
            spouse ? fullName(spouse) : member.spouseName
        ];

        values.forEach(value => {

            const td = document.createElement("td");

            td.textContent = value || "-";

            row.appendChild(td);
        });

        const actions = document.createElement("td");

        const editButton = document.createElement("button");

        editButton.textContent = "Edit";
        editButton.onclick = () => editMember(member.id);

        const deleteButton = document.createElement("button");

        deleteButton.textContent = "Delete";
        deleteButton.onclick = () => deleteMember(member.id);

        actions.append(editButton, deleteButton);

        row.appendChild(actions);

        table.appendChild(row);
    });

    if (filtered.length === 0) {

        const row = document.createElement("tr");

        const td = document.createElement("td");

        td.colSpan = 6;
        td.textContent = "No family members found.";

        row.appendChild(td);
        table.appendChild(row);
    }
}


/* ============================================
   10. EDIT MEMBER
============================================ */

function editMember(id) {

    const member = findMember(id);

    if (!member) return;

    showSection("addMember");

    document.getElementById("memberId").value = member.id;

    document.getElementById("firstName").value =
        member.firstName || "";

    document.getElementById("middleName").value =
        member.middleName || "";

    document.getElementById("lastName").value =
        member.lastName || "";

    document.getElementById("dob").value =
        member.dob || "";

    document.getElementById("dod").value =
        member.dod || "";

    document.getElementById("gender").value =
        member.gender || "";

    document.getElementById("occupation").value =
        member.occupation || "";

    document.getElementById("birthPlace").value =
        member.birthPlace || "";

    document.getElementById("address").value =
        member.address || "";

    document.getElementById("spouseName").value =
        member.spouseName || "";

    updateRelationshipOptions();

    document.getElementById("fatherId").value =
        member.fatherId || "";

    document.getElementById("motherId").value =
        member.motherId || "";

    document.getElementById("spouseId").value =
        member.spouseId || "";

    updateAge();
}


/* ============================================
   11. DELETE MEMBER
============================================ */

function deleteMember(id) {

    if (!confirm("Are you sure you want to delete this member?")) {
        return;
    }

    members = members.filter(m => m.id !== id);

    members.forEach(member => {

        if (member.fatherId === id) member.fatherId = "";

        if (member.motherId === id) member.motherId = "";

        if (member.spouseId === id) member.spouseId = "";
    });

    saveData();

    alert("Member deleted successfully!");
}


/* ============================================
   12. FAMILY TREE GENERATION
============================================ */

function displayTree() {

    const container =
        document.getElementById("treeContainer");

    container.innerHTML = "";

    if (members.length === 0) {

        const empty = document.createElement("div");

        empty.className = "tree-empty";

        empty.textContent = "No family members added yet.";

        container.appendChild(empty);

        return;
    }

    const tree = document.createElement("div");

    tree.className = "family-tree";

    const rootList = document.createElement("ul");

    rootList.className = "tree-root";

    const rendered = new Set();


    // Find spouse
    function getSpouse(person) {

        return members.find(m =>
            m.id !== person.id &&
            (
                m.id === person.spouseId ||
                m.spouseId === person.id
            )
        );
    }


    // Create person card
    function createPersonCard(person) {

        const card = document.createElement("div");

        card.className = "tree-person";

        if (person.dod) {
            card.classList.add("deceased");
        }

        const name = document.createElement("h3");

        name.textContent = fullName(person);

        const status = document.createElement("p");

        status.textContent = person.dod
            ? "Deceased"
            : "Living";

        const occupation = document.createElement("small");

        occupation.textContent =
            person.occupation || "Occupation not specified";

        const dob = document.createElement("small");

        dob.style.display = "block";

        dob.textContent = person.dob
            ? "Born: " + person.dob
            : "";

        card.append(name, status, occupation, dob);

        return card;
    }


    // Create couple
    function createCouple(first, second) {

        const couple = document.createElement("div");

        couple.className = "tree-couple";

        couple.appendChild(createPersonCard(first));

        if (second) {

            const heart = document.createElement("span");

            heart.className = "marriage-line";

            heart.textContent = "♥";

            couple.appendChild(heart);

            couple.appendChild(createPersonCard(second));
        }

        return couple;
    }


    // Generate generations recursively
    function createFamilyGroup(first, second, ancestors) {

        const li = document.createElement("li");

        li.appendChild(createCouple(first, second));

        const parentIds = [first.id];

        if (second) {
            parentIds.push(second.id);
        }

        const nextAncestors = new Set([
            ...ancestors,
            ...parentIds
        ]);

        // Find children belonging to either parent
        const children = members.filter(child => {

            return (
                !nextAncestors.has(child.id) &&
                (
                    parentIds.includes(child.fatherId) ||
                    parentIds.includes(child.motherId)
                )
            );
        });

        if (children.length === 0) {
            return li;
        }

        const childList = document.createElement("ul");

        childList.className = "tree-children";

        children.forEach(child => {

            if (rendered.has(child.id)) return;

            rendered.add(child.id);

            let spouse = getSpouse(child);

            // Do not duplicate a member already displayed
            if (
                spouse &&
                (
                    rendered.has(spouse.id) ||
                    nextAncestors.has(spouse.id)
                )
            ) {
                spouse = null;
            }

            if (spouse) {
                rendered.add(spouse.id);
            }

            const childGroup = createFamilyGroup(
                child,
                spouse,
                nextAncestors
            );

            childList.appendChild(childGroup);
        });

        if (childList.children.length > 0) {
            li.appendChild(childList);
        }

        return li;
    }


    // Find first generation
    const roots = members.filter(person => {

        const fatherExists = !!findMember(person.fatherId);

        const motherExists = !!findMember(person.motherId);

        return !fatherExists && !motherExists;
    });


    // Build first generation
    roots.forEach(person => {

        if (rendered.has(person.id)) return;

        rendered.add(person.id);

        let spouse = getSpouse(person);

        if (spouse && rendered.has(spouse.id)) {
            spouse = null;
        }

        if (spouse) {
            rendered.add(spouse.id);
        }

        rootList.appendChild(
            createFamilyGroup(
                person,
                spouse,
                new Set()
            )
        );
    });


    // Show disconnected records too
    members.forEach(person => {

        if (rendered.has(person.id)) return;

        rendered.add(person.id);

        let spouse = getSpouse(person);

        if (spouse && rendered.has(spouse.id)) {
            spouse = null;
        }

        if (spouse) {
            rendered.add(spouse.id);
        }

        rootList.appendChild(
            createFamilyGroup(
                person,
                spouse,
                new Set()
            )
        );
    });

    tree.appendChild(rootList);

    container.appendChild(tree);
}


/* ============================================
   13. EXCEL EXPORT
============================================ */

function exportExcel() {

    if (typeof XLSX === "undefined") {

        alert("Excel library not loaded. Check your internet connection.");

        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(members);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Family Members"
    );

    XLSX.writeFile(
        workbook,
        "Family_Tree_Data.xlsx"
    );
}


/* ============================================
   14. EXCEL DATE CONVERSION
============================================ */

function excelDate(value) {

    if (!value) return "";

    if (value instanceof Date && !isNaN(value)) {

        const year = value.getFullYear();

        const month = String(
            value.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            value.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    if (typeof value === "number") {

        const date = XLSX.SSF.parse_date_code(value);

        if (!date) return "";

        return [
            date.y,
            String(date.m).padStart(2, "0"),
            String(date.d).padStart(2, "0")
        ].join("-");
    }

    const text = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return text;
    }

    return "";
}


/* ============================================
   15. EXCEL IMPORT
============================================ */

function importExcel(event) {

    const file = event.target.files[0];

    if (!file) return;

    if (typeof XLSX === "undefined") {

        alert("Excel library not loaded.");

        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {

        try {

            const workbook = XLSX.read(
                new Uint8Array(e.target.result),
                {
                    type: "array",
                    cellDates: true
                }
            );

            const worksheet =
                workbook.Sheets[workbook.SheetNames[0]];

            const rows =
                XLSX.utils.sheet_to_json(worksheet);

            if (rows.length === 0) {
                throw new Error("No records found in Excel.");
            }

            const imported = rows.map(row => {

                const dob = excelDate(row.dob);

                const dod = excelDate(row.dod);

                if (
                    !row.firstName ||
                    !row.lastName ||
                    !dob ||
                    (dod && dod < dob)
                ) {
                    throw new Error(
                        "Invalid name or date in Excel."
                    );
                }

                return {

                    id: String(row.id || generateId()),

                    firstName: String(row.firstName),

                    middleName: String(row.middleName || ""),

                    lastName: String(row.lastName),

                    dob: dob,

                    dod: dod,

                    age: calculateAge(dob, dod),

                    gender: String(row.gender || ""),

                    occupation: String(row.occupation || ""),

                    birthPlace: String(row.birthPlace || ""),

                    address: String(row.address || ""),

                    spouseName: String(row.spouseName || ""),

                    fatherId: String(row.fatherId || ""),

                    motherId: String(row.motherId || ""),

                    spouseId: String(row.spouseId || "")
                };
            });

            const replace = confirm(
                "Click OK to replace existing records.\n" +
                "Click Cancel to add imported records."
            );

            let updatedMembers;

            if (replace) {

                updatedMembers = imported;

            } else {

                updatedMembers = [...members];

                imported.forEach(person => {

                    if (
                        updatedMembers.some(m => m.id === person.id)
                    ) {
                        person.id = generateId();
                    }

                    updatedMembers.push(person);
                });
            }

            const ids = updatedMembers.map(m => m.id);

            if (new Set(ids).size !== ids.length) {
                throw new Error("Duplicate member IDs detected.");
            }

            members = updatedMembers;

            // Reconnect spouse relationships
            members.forEach(person => {

                const spouse = findMember(person.spouseId);

                if (spouse && !spouse.spouseId) {
                    spouse.spouseId = person.id;
                }
            });

            saveData();

            alert("Excel imported successfully!");

        } catch (error) {

            alert("Excel import failed: " + error.message);
        }

        event.target.value = "";
    };

    reader.readAsArrayBuffer(file);
}


/* ============================================
   16. INITIALIZE APPLICATION
============================================ */

function initializeApplication() {

    updateDashboard();

    displayMembers();

    updateRelationshipOptions();

    displayTree();

    showSection("dashboard");
}

initializeApplication();
