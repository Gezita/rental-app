/**
 * Creates the "How do you manage your rental properties today?" Google Form.
 *
 * Setup:
 * 1. Go to https://script.google.com → New project
 * 2. Paste this entire file into Code.gs (replace any default code)
 * 3. Click Run → createLandlordSurveyForm
 * 4. Authorize when prompted (first run only)
 * 5. Check View → Logs for the published form URL
 */

function createLandlordSurveyForm() {
  var form = FormApp.create("How do you manage your rental properties today?");

  form.setDescription(
    "We're building a simple tool for small Ontario landlords — billing, documents, and tenant payments. " +
      "This survey takes about 5 minutes. Your answers help us build something actually useful. Thank you!"
  );
  form.setConfirmationMessage(
    "Thanks! We'll use your answers to shape what we build."
  );
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);
  form.setCollectEmail(false);

  // ── Section 1: About you & your portfolio ──────────────────────────────
  form.addPageBreakItem().setTitle("About you & your portfolio");

  form
    .addMultipleChoiceItem()
    .setTitle("How many rental units do you manage?")
    .setChoiceValues(["1", "2–3", "4–10", "11–20", "20+"])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle("What types of properties do you own?")
    .setChoiceValues([
      "Single-family / basement apartment",
      "Duplex",
      "Triplex / fourplex",
      "Condo",
      "Other",
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle("Where are your properties?")
    .setChoiceValues([
      "Ontario only",
      "Ontario + other provinces",
      "Outside Ontario",
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle("How do you manage them day to day?")
    .setChoiceValues([
      "Just me",
      "Me + spouse/family",
      "Property manager",
      "Accountant/bookkeeper helps",
    ])
    .setRequired(true);

  // ── Section 2: How you organize things today ───────────────────────────
  form.addPageBreakItem().setTitle("How you organize things today");

  form
    .addCheckboxItem()
    .setTitle("How do you organize files for each property?")
    .setChoiceValues([
      "Paper folders / filing cabinet",
      "Folders on my computer (Desktop, Documents, etc.)",
      "Google Drive / Dropbox / iCloud",
      "Spreadsheet (Excel / Google Sheets)",
      "Inside a rental app",
      "Mix of the above",
      "I don't really organize — it's scattered",
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle("What do you keep track of per property?")
    .setChoiceValues([
      "Leases",
      "Utility bills",
      "Monthly tenant statements",
      "Payment records / receipts",
      "Maintenance & repairs",
      "LTB notices",
      "Insurance / mortgage docs",
      "Other",
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle("How hard is it to find a specific document when you need it?")
    .setChoiceValues([
      "Very easy",
      "Somewhat easy",
      "Somewhat hard",
      "Very hard",
    ])
    .setRequired(true);

  // ── Section 3: Tools & apps ─────────────────────────────────────────────
  form.addPageBreakItem().setTitle("Tools & apps");

  var usesAppItem = form
    .addMultipleChoiceItem()
    .setTitle("Do you use any app or software to manage your rentals?")
    .setChoiceValues([
      "No — spreadsheets and/or paper only",
      "Yes — one main tool",
      "Yes — several tools for different tasks",
    ])
    .setRequired(true);

  var toolsForItem = form
    .addCheckboxItem()
    .setTitle("If you use tools, what do you use them for?")
    .setChoiceValues([
      "Rent collection",
      "Expense tracking",
      "Accounting / taxes",
      "Tenant communication",
      "Lease signing",
      "Maintenance",
      "Document storage",
      "Nothing fits well",
    ]);

  var toolNameItem = form
    .addTextItem()
    .setTitle("If you use a main tool, what is it called?")
    .setHelpText("Skip if you don't use an app.");

  form
    .addParagraphTextItem()
    .setTitle("What's the most frustrating part of your current setup?")
    .setRequired(false);

  // Skip tool follow-ups when respondent doesn't use an app
  var noAppChoice = usesAppItem.getChoices()[0];
  toolsForItem.showWhenFormulaSatisfied(
    '=' + usesAppItem.getId() + ' <> "' + noAppChoice.getValue() + '"'
  );

  toolNameItem.showWhenFormulaSatisfied('=' + usesAppItem.getId() + ' <> "' + noAppChoice.getValue() + '"');

  // ── Section 4: Billing & utilities ────────────────────────────────────
  form.addPageBreakItem().setTitle("Billing & utilities");

  var utilitiesSeparateItem = form
    .addMultipleChoiceItem()
    .setTitle("Do tenants pay utilities separately from rent?")
    .setChoiceValues([
      "No — all included in rent",
      "Yes — some or all utilities are split/charged back",
      "Varies by unit",
    ])
    .setRequired(true);

  var splitMethodItem = form
    .addCheckboxItem()
    .setTitle("If you split utilities, how do you calculate each tenant's share?")
    .setChoiceValues([
      "Fixed percentage per unit",
      "By square footage",
      "Equal split",
      "Manual guess each month",
      "I don't split utilities",
    ]);

  var includedInRentChoice = utilitiesSeparateItem.getChoices()[0];
  splitMethodItem.showWhenFormulaSatisfied(
    '=' + utilitiesSeparateItem.getId() + ' <> "' + includedInRentChoice.getValue() + '"'
  );

  form
    .addCheckboxItem()
    .setTitle("How do you send tenants their monthly bill / statement?")
    .setChoiceValues([
      "Email",
      "Text / WhatsApp",
      "Paper",
      "In person",
      "I don't send formal statements",
      "Other",
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle("How do tenants usually pay rent?")
    .setChoiceValues([
      "eTransfer",
      "Cheque",
      "Cash",
      "Bank transfer / PAD",
      "Credit/debit card (Stripe, etc.)",
      "Other",
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle("How often do you deal with late or partial payments?")
    .setChoiceValues(["Rarely", "Sometimes", "Often", "Very often"])
    .setRequired(true);

  // ── Section 5: Ontario & compliance ───────────────────────────────────
  form.addPageBreakItem().setTitle("Ontario & compliance");

  form
    .addMultipleChoiceItem()
    .setTitle("Have you ever needed to issue an LTB notice (N1, N4, N12, etc.)?")
    .setChoiceValues([
      "Yes, regularly",
      "Yes, once or twice",
      "No, but I might",
      "No, and I don't expect to",
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle("How do you handle LTB forms today?")
    .setChoiceValues([
      "Download from LTB site and fill manually",
      "Lawyer / paralegal",
      "Property manager",
      "Haven't needed to",
      "Other",
    ])
    .setRequired(true);

  // ── Section 6: Taxes & accounting ───────────────────────────────────────
  form.addPageBreakItem().setTitle("Taxes & accounting");

  form
    .addMultipleChoiceItem()
    .setTitle("Do you want a rental app that also handles taxes?")
    .setChoiceValues([
      "Yes — I want tax prep / filing built in",
      "Somewhat — I mainly need expense summaries for my accountant",
      "No — I use QuickBooks / an accountant / TurboTax separately",
      "Not sure",
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle("What do you need at tax time?")
    .setChoiceValues([
      "Income vs expense report per property",
      "CRA-ready export",
      "Receipt / invoice storage",
      "Depreciation / CCA tracking",
      "My accountant handles everything",
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle("Who prepares your rental taxes today?")
    .setChoiceValues([
      "I do it myself",
      "Accountant",
      "Tax software only",
      "Haven't filed rental income separately",
    ])
    .setRequired(true);

  // ── Section 7: Pain points & priorities ─────────────────────────────────
  form.addPageBreakItem().setTitle("Pain points & priorities");

  form
    .addCheckboxItem()
    .setTitle("What are your top 3 headaches? (pick up to 3)")
    .setChoiceValues([
      "Splitting utility bills fairly",
      "Chasing rent / tracking who paid what",
      "Keeping documents organized",
      "Generating monthly statements",
      "Maintenance tracking",
      "Lease renewals & end dates",
      "LTB paperwork",
      "Tax / year-end reporting",
      "Tenant communication",
      "Other",
    ])
    .setValidation(
      FormApp.createCheckboxValidation()
        .requireCheckboxCountBetween(1, 3)
        .setHelpText("Please select 1 to 3 options.")
        .build()
    )
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle(
      "How many hours per month do you spend on admin (billing, docs, chasing payments)?"
    )
    .setChoiceValues(["Under 2", "2–5", "5–10", "10+"])
    .setRequired(true);

  form
    .addParagraphTextItem()
    .setTitle("What would make you switch from your current system?")
    .setRequired(false);

  form
    .addParagraphTextItem()
    .setTitle("What's the one thing that would save you the most time each month?")
    .setRequired(false);

  // ── Section 8: Interest & follow-up ───────────────────────────────────
  form.addPageBreakItem().setTitle("Interest & follow-up");

  form
    .addMultipleChoiceItem()
    .setTitle(
      "Would you try a simple app focused on properties, utility splits, monthly statements, payments, and document storage?"
    )
    .setChoiceValues([
      "Definitely",
      "Probably",
      "Maybe",
      "Probably not",
      "No",
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle("What monthly price feels fair for 1–5 units?")
    .setChoiceValues([
      "Free only",
      "$5–10",
      "$10–20",
      "$20–40",
      "$40+",
      "I'd pay per unit",
    ])
    .setRequired(true);

  var followUpItem = form
    .addMultipleChoiceItem()
    .setTitle("Would you be open to a 15-minute follow-up call?")
    .setChoiceValues(["Yes", "No thanks"])
    .setRequired(true);

  var emailItem = form
    .addTextItem()
    .setTitle("If yes, what's the best email to reach you?")
    .setHelpText("Only if you said yes above.");

  var yesFollowUpChoice = followUpItem.getChoices()[0];
  emailItem
    .setValidation(
      FormApp.createTextValidation()
        .whenFormulaSatisfied('=' + followUpItem.getId() + ' = "' + yesFollowUpChoice.getValue() + '"')
        .requireTextIsEmail()
        .setHelpText("Please enter a valid email address.")
        .build()
    )
    .showWhenFormulaSatisfied('=' + followUpItem.getId() + ' = "' + yesFollowUpChoice.getValue() + '"');

  // ── Link response sheet ─────────────────────────────────────────────────
  var ss = SpreadsheetApp.create("Landlord Survey Responses");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  var editUrl = form.getEditUrl();
  var publishedUrl = form.getPublishedUrl();

  Logger.log("Form created successfully!");
  Logger.log("Edit URL:       " + editUrl);
  Logger.log("Published URL:  " + publishedUrl);
  Logger.log("Responses sheet: " + ss.getUrl());

  return {
    editUrl: editUrl,
    publishedUrl: publishedUrl,
    responsesSheetUrl: ss.getUrl(),
  };
}
