function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data  = JSON.parse(e.postData.contents);

    var firstName = (data.firstName || '').trim().toLowerCase();
    var lastName  = (data.lastName  || '').trim().toLowerCase();

    // ── تحقق من التكرار ──
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var col3 = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
      var col4 = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
      for (var i = 0; i < col3.length; i++) {
        var existFirst = (col3[i][0] || '').toString().trim().toLowerCase();
        var existLast  = (col4[i][0] || '').toString().trim().toLowerCase();
        if (existFirst === firstName && existLast === lastName) {
          return ContentService
            .createTextOutput(JSON.stringify({ status: 'duplicate' }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // ── حفظ البيانات ──
    sheet.appendRow([
      data.timestamp     || '',   // A - الوقت
      data.type          || '',   // B - نوع التسجيل (بالعربية)
      data.firstName     || '',   // C - الاسم
      data.lastName      || '',   // D - اللقب
      data.birthDate     || '',   // E - تاريخ الميلاد
      data.address       || '',   // F - العنوان
      data.phone         || '',   // G - الهاتف
      data.eduLevel      || '',   // H - المستوى
      data.candidateType || '',   // I - نوع المترشح
      data.specialty     || '',   // J - التخصص
      data.subject       || '',   // K - المادة
      data.teacher       || '',   // L - الأستاذ
      data.parentName    || '',   // M - اسم الولي
      data.parentPhone   || '',   // N - هاتف الولي
      data.langType      || '',   // O - اللغة المختارة
      data.langLevel     || '',   // P - مستوى اللغة
      data.selectedDays  || '',   // Q - الأيام المختارة
      data.levelTest     || '',   // R - اختبار المستوى
      data.motivation    || '',   // S - الدافع
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
