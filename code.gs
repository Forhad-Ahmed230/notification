// --- কনফিগারেশন শুরু ---
// আপনার Google Spreadsheet এর ID এখানে দিন (যদি শিটে সেভ করতে চান)
const SPREADSHEET_ID = '1mP2UGvVVfaoGKCPzLTnhXbhn22H_IqsK8uVGFNAZYn0'; // <<--- আপনার দেওয়া স্প্রেডশীট আইডি
const SHEET_NAME = 'অর্ডার ডেটা'; // <<--- আপনার দেওয়া শিটের নাম

// আপনার যে ইমেইলে নোটিফিকেশন পেতে চান, সেটি এখানে দিন
const RECIPIENT_EMAIL = 'contacts2forhad@gmail.com'; // <<--- আপনার ইমেইল
// --- কনফিগারেশন শেষ ---

// doPost ফাংশন, যা HTML ফর্ম থেকে ডেটা রিসিভ করে
function doPost(e) {
  Logger.log('-------------------- doPost Execution Started (v3.3 - Full Code Provided) --------------------');
  let response;
  let eventDetails = {
    parameter: null,
    postDataContents: null,
    postDataType: null,
    contentLength: -1,
    errorProcessingEvent: null
  };

  try {
    if (typeof e !== 'undefined' && e !== null) {
      Logger.log('Event object (e) is PRESENT.');
      eventDetails.parameter = e.parameter ? JSON.stringify(e.parameter) : null;
      Logger.log('Raw e.parameter for debugging: ' + JSON.stringify(e.parameter)); // HTML ফর্ম থেকে আসা ডেটা লগ করা হচ্ছে

      if (e.postData) {
        eventDetails.postDataType = e.postData.type;
        eventDetails.contentLength = e.postData.length;
      } else {
        Logger.log('e.postData is undefined or null.');
      }
    } else {
      Logger.log('CRITICAL: Event object (e) is UNDEFINED or NULL. This function should be triggered by an HTTP POST from your HTML form.');
      eventDetails.errorProcessingEvent = "Event object (e) was undefined or null.";
      throw new Error(eventDetails.errorProcessingEvent);
    }

    const formData = e.parameter;

    if (!formData || Object.keys(formData).length === 0) {
      Logger.log('Error: formData (from e.parameter) is undefined, null, or empty.');
      eventDetails.errorProcessingEvent = 'Form data (e.parameter) was undefined, null, or empty.';
      throw new Error(eventDetails.errorProcessingEvent);
    }
    Logger.log('formData (from e.parameter) successfully retrieved.');


    // --- ইমেইলের জন্য বডি তৈরি করা ---
    let emailBody = "প্রিয় স্যার/ম্যাডাম,\n\nএকটি নতুন আমের অর্ডার এসেছে। বিস্তারিত নিচে দেওয়া হলো:\n\n";
    let missingFields = [];

    const formFieldsInOrder = [
      'নাম', 'ঠিকানা', 'মোবাইল নম্বর', 'কুরিয়ার',
      'নির্বাচিত পণ্য ও পরিমাণ', 'শিপিং পদ্ধতি', 'সাবটোটাল',
      'শিপিং চার্জ', 'মোট টাকা', 'পেমেন্ট পদ্ধতি',
      'গ্রাহকের বিকাশ নম্বর', 'বিকাশ ট্রানজেকশন আইডি'
    ];

    formFieldsInOrder.forEach(fieldName => {
      const value = formData[fieldName]; // e.parameter থেকে সরাসরি ভ্যালু নেওয়া হচ্ছে
      if (typeof value !== 'undefined' && value !== null && String(value).trim() !== '') {
        emailBody += fieldName + ": " + value + "\n";
      } else {
        emailBody += fieldName + ": (খালি)\n";
        missingFields.push(fieldName);
      }
    });

    if (missingFields.length > 0) {
      Logger.log('Warning: The following form fields were not found, were undefined, or were empty in formData: ' + missingFields.join(', '));
    }
    emailBody += "\nধন্যবাদান্তে,\nআপনার ওয়েবসাইট";
    Logger.log('Constructed Email Body.');

    // --- ইমেইল পাঠানো ---
    if (!RECIPIENT_EMAIL || RECIPIENT_EMAIL.trim() === '' || !/\S+@\S+\.\S+/.test(RECIPIENT_EMAIL)) {
      Logger.log('Error: RECIPIENT_EMAIL is not a valid email address or is empty. Current value: "' + RECIPIENT_EMAIL + '"');
      throw new Error('প্রাপকের ইমেইল সঠিকভাবে কনফিগার করা হয়নি বা ফরম্যাট সঠিক নয়।');
    }
    const customerNameFromForm = formData['নাম'] ? formData['নাম'] : 'অজানা গ্রাহক'; // formData থেকে নাম নেওয়া
    const emailSubject = "নতুন আমের অর্ডার: " + customerNameFromForm;
    MailApp.sendEmail(RECIPIENT_EMAIL, emailSubject, emailBody);
    Logger.log("Email successfully sent to: " + RECIPIENT_EMAIL);

    // --- Google Sheet-এ ডেটা সেভ করা ---
    if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '' &&
        SHEET_NAME && SHEET_NAME.trim() !== '') {
      Logger.log('Attempting to save data to Google Sheet (ID: ' + SPREADSHEET_ID + ', Sheet: ' + SHEET_NAME + ')');
      try {
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        Logger.log('Spreadsheet opened: ' + spreadsheet.getName() + ' (ID: ' + spreadsheet.getId() + ')');
        let sheet = spreadsheet.getSheetByName(SHEET_NAME);

        if (!sheet) {
          Logger.log('Warning: Sheet "' + SHEET_NAME + '" not found in spreadsheet "' + spreadsheet.getName() + '". Attempting to create it.');
          sheet = spreadsheet.insertSheet(SHEET_NAME);
          Logger.log('Sheet "' + SHEET_NAME + '" created.');
          // নতুন শীটে হেডার যুক্ত করা
          const headerRow = ["Timestamp"].concat(formFieldsInOrder);
          sheet.appendRow(headerRow);
          Logger.log('Header row added to the new sheet: ' + headerRow.join(', '));
        } else {
          Logger.log('Sheet "' + SHEET_NAME + '" found in spreadsheet "' + spreadsheet.getName() + '".');
        }

        let sheetRowData = [new Date()]; // টাইমস্ট্যাম্প যোগ করা হলো
        formFieldsInOrder.forEach(fieldName => {
          sheetRowData.push(formData[fieldName] || ''); // যদি ডেটা না থাকে, খালি স্ট্রিং যোগ হবে
        });
        sheet.appendRow(sheetRowData);
        Logger.log("Data successfully appended to sheet: " + SHEET_NAME + ". Row: " + sheetRowData.join(', '));

      } catch (sheetError) {
        Logger.log('!!!!!!!!!!!!!!!!!!!! ERROR saving data to Google Sheet !!!!!!!!!!!!!!!!!!!!');
        Logger.log('Sheet Error Message: ' + sheetError.toString());
        Logger.log('Sheet Error Name: ' + sheetError.name);
        Logger.log('Sheet Error Stack: ' + sheetError.stack);
        // যদি শীটে সেভ করতে সমস্যা হয়, তবুও ইমেইল যেন চলে যায়, তাই এখানে থ্রো না করে শুধু লগ করা হচ্ছে।
        // আপনি চাইলে এখানেও একটি এরর রেসপন্স পাঠাতে পারেন বা ইমেইল নোটিফিকেশনে জানাতে পারেন।
      }
    } else {
      Logger.log('SPREADSHEET_ID or SHEET_NAME is not configured correctly or is empty. Skipping Google Sheet save.');
    }

    Logger.log('doPost function completed successfully. Returning success JSON.');
    response = ContentService
      .createTextOutput(JSON.stringify({ "result": "success", "message": "আপনার অর্ডার সফলভাবে গৃহীত হয়েছে এবং একটি ইমেইল পাঠানো হয়েছে।" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('!!!!!!!!!! CRITICAL ERROR in doPost (v3.3) !!!!!!!!!!');
    Logger.log('Error Message: ' + error.toString());
    Logger.log('Error Stack: ' + error.stack);
    Logger.log('Event Details at time of error: ' + JSON.stringify(eventDetails, null, 2));
    response = ContentService
      .createTextOutput(JSON.stringify({ "result": "error", "error_message": "সার্ভারে একটি সমস্যা হয়েছে: " + error.toString(), "debug_event_details": eventDetails }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    Logger.log('-------------------- doPost Execution Ended (v3.3) --------------------');
  }
  return response;
}

function testPermissionsAndSetup() {
  Logger.log('-------------------- testPermissionsAndSetup Started (v3.3) --------------------');
  try {
    // ইমেইল পাঠানোর অনুমতি পরীক্ষা
    if (!RECIPIENT_EMAIL || RECIPIENT_EMAIL.trim() === '' || !/\S+@\S+\.\S+/.test(RECIPIENT_EMAIL)) {
      Logger.log('Skipping email test: RECIPIENT_EMAIL is not a valid email address or is empty. It is currently: "' + RECIPIENT_EMAIL + '"');
    } else {
      MailApp.sendEmail(RECIPIENT_EMAIL, "Apps Script Test (v3.3): Email Permission", "This is a test email to confirm MailApp permissions are working.");
      Logger.log("Test email permission check: An email should have been sent to " + RECIPIENT_EMAIL + ". Please check your inbox (and spam folder).");
    }

    // স্প্রেডশীট অ্যাক্সেসের অনুমতি পরীক্ষা (যদি কনফিগার করা থাকে)
    if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '' &&
        SHEET_NAME && SHEET_NAME.trim() !== '') {
      Logger.log('Attempting to test spreadsheet access for SPREADSHEET_ID: "' + SPREADSHEET_ID + '" and SHEET_NAME: "' + SHEET_NAME + '"');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      Logger.log('Spreadsheet opened successfully: ' + ss.getName() + ' (ID: ' + ss.getId() + ')'); // স্প্রেডশীটের আসল আইডি লগ করা হচ্ছে
      let sheet = ss.getSheetByName(SHEET_NAME);
      if (!sheet) {
        Logger.log('WARNING during test: Sheet "' + SHEET_NAME + '" was not found in the spreadsheet. If this is the first run, the doPost function will attempt to create it.');
      } else {
        Logger.log('Sheet "' + SHEET_NAME + '" accessed successfully.');
      }
    } else {
      Logger.log('Skipping spreadsheet test: SPREADSHEET_ID or SHEET_NAME is not configured correctly or is empty.');
    }
    Logger.log('testPermissionsAndSetup completed successfully (v3.3).');

  } catch (e) {
    Logger.log('!!!!!!!!!! ERROR in testPermissionsAndSetup (v3.3) !!!!!!!!!!');
    Logger.log('Error Message: ' + e.toString());
    Logger.log('Error Stack: ' + e.stack);
    if (e.message && e.message.includes("You do not have permission to call SpreadsheetApp.openById")) {
        Logger.log("Specific Error during test: Make sure the SPREADSHEET_ID ('" + SPREADSHEET_ID + "') is correct and the Apps Script project has permission to access it.");
    } else if (e.message && e.message.includes("Document " + SPREADSHEET_ID + " is missing")) {
        Logger.log("Specific Error during test: The spreadsheet with ID '" + SPREADSHEET_ID + "' could not be found. Please verify the ID.");
    }
  } finally {
    Logger.log('-------------------- testPermissionsAndSetup Ended (v3.3) --------------------');
  }
}