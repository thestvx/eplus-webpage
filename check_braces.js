var fs = require('fs');
['teacher.html', 'student.html', 'attendance.html'].forEach(function(f) {
  var content = fs.readFileSync(f, 'utf8');
  var opens = (content.match(/\{/g) || []).length;
  var closes = (content.match(/\}/g) || []).length;
  var pO = (content.match(/\(/g) || []).length;
  var pC = (content.match(/\)/g) || []).length;
  console.log(f + ': braces=' + opens + '/' + closes + (opens === closes ? ' OK' : ' MISMATCH') + ' parens=' + pO + '/' + pC + (pO === pC ? ' OK' : ' MISMATCH'));
});
