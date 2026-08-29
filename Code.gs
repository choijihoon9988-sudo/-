/**
 * 레퍼런스 인박스 - Telegram → 저장(가벼움) / 분석(심층, Gemini) → Google Sheet → 밤 11시 리캡
 *
 * 사용법:
 *   유튜브 링크만 보내기        → "나중에 볼 영상"으로 가볍게 저장만 (분석 안 함)
 *   "/분석 <링크>"             → 그 영상을 헌법 형식으로 심층 분석
 *   저장된 링크 메시지에 답장으로 "/분석" → 그 영상을 심층 분석 (링크 다시 안 붙여도 됨)
 *   링크가 아닌 일반 텍스트     → 아이디어로 자동 분석
 *
 * 설정 방법(스크립트 속성, 프로젝트 설정 > 스크립트 속성에 추가):
 *   BOT_TOKEN       텔레그램 봇 토큰
 *   GEMINI_API_KEY  aistudio.google.com/apikey 에서 발급한 API 키
 *   WEBAPP_URL      이 스크립트를 웹앱으로 배포한 후 나오는 URL
 *   YOUTUBE_PROMPT  (선택) 유튜브 분석 프롬프트 커스텀. {{TITLE}}, {{CHANNEL}}, {{TRANSCRIPT}} 자리표시자 사용 가능
 *   IDEA_PROMPT     (선택) 아이디어 분석 프롬프트 커스텀. {{TEXT}} 자리표시자 사용 가능
 * (OWNER_CHAT_ID 는 첫 메시지를 보내면 자동으로 등록됩니다)
 */

var GEMINI_MODEL = 'gemini-3.6-flash';
// 위 모델이 과부하(503)일 때 자동으로 시도할 대체 모델들
var GEMINI_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
var SHEET_ID = '1WrqcX2gYQV-9pOg_CCtgGtzCXQ93wBHv4q_hFT2JVmA';
var SHEET_NAME = '시트1';

var DEFAULT_YOUTUBE_PROMPT =
  '다음은 유튜브 영상 정보입니다.\n' +
  '제목: {{TITLE}}\n' +
  '채널: {{CHANNEL}}\n\n' +
  '영상 스크립트/자막(있는 경우):\n{{TRANSCRIPT}}\n\n' +
  '위 내용을 바탕으로 아래 형식에 맞춰 이 영상을 "헌법"이라는 이름으로 심층 분석해줘.\n\n' +
  '#### [A] 콘텐츠 해부\n\n' +
  '**A-1) 스토리 한 줄 요약**\n' +
  '이 대본이 결국 무슨 이야기인지 한 문장으로 요약한다. (군더더기 없이 "누가 무엇을 해서 어떻게 됐다")\n\n' +
  '**A-2) 시작 – 전개 – 결말 구조**\n' +
  '- 시작: 어떻게 문을 여는가 (어떤 상황/인물/결핍/질문으로 시작하는가)\n' +
  '- 전개: 어떤 방식으로 끌고 가는가 (사건이 쌓이는 방식, 단계, 긴장이 커지는 패턴)\n' +
  '- 결말: 어떻게 닫는가 (반전/회수/폭발/여운 중 무엇으로 끝나는가)\n\n' +
  '**A-3) 시청자 감정의 흐름**\n' +
  '시청자가 영상을 보는 동안 느끼는 감정이 어떤 순서로 흘러가는지 화살표로 정리한다.\n' +
  '(예: 호기심 → 답답함/이입 → 긴장 고조 → 통쾌함/반전 → 후련한 여운)\n' +
  '각 감정 전환이 대본의 어느 지점에서 일어나는지도 함께 표시한다.\n\n' +
  '**A-4) 핵심 대리만족 한 문장 (헌법의 심장)**\n' +
  '시청자가 이 쇼츠에서 얻는 가장 핵심적인 대리만족을 단 하나의 문장으로 못박는다.\n' +
  '이 한 문장이 헌법 전체의 심장이며, 이후 모든 제안·대본·평가는 결국 "이 한 문장을 다시 느끼게 하는가"로 수렴한다.\n' +
  '(예: "내가 차마 못한 복수를, 누군가 더 통쾌하게 대신 해준다.")\n\n' +
  '#### [B] 작동 원리\n\n' +
  '**B-1) 근본적인 대리만족 (A-4의 근거)**\n' +
  'A-4의 한 문장이 왜 성립하는지를 풀어쓴다. 이 쇼츠가 시청자에게 충족시키는 본질적 욕구가 무엇인지 구체적으로 설명한다.\n' +
  '(예: "내가 못한 복수를 누군가 대신 해주는 쾌감", "사소한 집착이 거대한 결과로 폭발하는 카타르시스" 등)\n\n' +
  '**B-2) 대리만족을 위한 필수 장치 (누가 / 무엇을 / 어떻게)**\n' +
  '- 누가: 어떤 인물 구도인가\n' +
  '- 무엇을: 어떤 사건/대상이 중심인가\n' +
  '- 어떻게: 어떤 전개 방식으로 그 대리만족을 발생시키는가\n\n' +
  '**B-3) 구조적 특징**\n' +
  '- 분량 (글자 수, 예상 초)\n' +
  '- 오프닝 후킹 방식\n' +
  '- 중간 전개의 비트 패턴\n' +
  '- 결말 처리 방식\n\n' +
  '분석이 끝나면 [A] 콘텐츠 해부(A-1~A-4)와 [B] 작동 원리(B-1~B-3)를 합쳐 "📜 헌법"이라는 이름으로 명확히 정리해서 보여줘.\n' +
  '정리할 때 맨 위에 A-4(핵심 대리만족 한 문장)를 "🔥 핵심 대리만족:" 이라고 눈에 띄게 먼저 선언하고, 그 아래 나머지 항목을 순서대로 배치해줘.\n' +
  '텔레그램 메시지로 보낼 거라 마크다운 별표(**, *)는 쓰지 말고 이모지와 줄바꿈만으로 구조를 표현해줘.';

var DEFAULT_IDEA_PROMPT =
  '다음은 사용자가 메모한 아이디어입니다:\n"{{TEXT}}"\n\n' +
  '이 아이디어의 핵심을 다듬고 분류해줘.';

// 이 코드의 버전 표시 (배포가 실제로 반영됐는지 확인용)
var CODE_VERSION = 'v10-twostep';

// 브라우저로 웹앱 URL을 열면 현재 배포된 버전이 보임
function doGet() {
  return HtmlService.createHtmlOutput('배포된 코드 버전: ' + CODE_VERSION);
}

// ---------- 텔레그램 웹훅 수신 ----------
function doPost(e) {
  try {
    var update = JSON.parse(e.postData.contents);
    var message = update.message;
    if (!message) return HtmlService.createHtmlOutput('ok');

    var props = PropertiesService.getScriptProperties();

    // 텔레그램이 같은 업데이트를 재전송(retry)하는 경우가 있어서, 똑같은 update_id만 건너뜀.
    // (번호 크기로 비교하면 병렬 전송 시 순서가 뒤바뀌어 정상 메시지까지 버려지므로 개별 기록 방식 사용)
    var updateId = update.update_id;
    if (updateId !== undefined) {
      var cache = CacheService.getScriptCache();
      var seenKey = 'upd_' + updateId;
      if (cache.get(seenKey)) {
        return HtmlService.createHtmlOutput('ok'); // 이미 처리한 재전송 → 무시
      }
      cache.put(seenKey, '1', 600); // 10분간 기억
    }

    var chatId = message.chat.id;
    // 앞뒤 공백 제거 + 한글 유니코드 정규화(NFC).
    // iOS 등에서 한글이 낱자로 분해된 NFD로 오면 눈에는 같아 보여도 문자열 비교가 실패함
    var text = (message.text || message.caption || '');
    try { text = text.normalize('NFC'); } catch (e) {}
    text = text.trim();
    var ownerId = props.getProperty('OWNER_CHAT_ID');

    if (!ownerId) {
      props.setProperty('OWNER_CHAT_ID', String(chatId));
      ownerId = String(chatId);
      sendTelegram(chatId, '✅ 봇 등록 완료!\n\n📺 유튜브 링크만 보내면 "나중에 볼 영상"으로 저장\n🔍 "/분석 <링크>" 또는 저장된 링크에 답장으로 "/분석" → 심층 분석\n💡 그 외 텍스트는 아이디어로 자동 분석\n💬 "/대화" 또는 "/ai" → 기억 유지되는 AI 대화 모드 (끝낼 땐 "/종료")');
      if (!text) return HtmlService.createHtmlOutput('ok');
    }

    if (String(chatId) !== ownerId) {
      return HtmlService.createHtmlOutput('ok');
    }

    if (!text) return HtmlService.createHtmlOutput('ok');

    // ---- 대화 모드 진입/종료 ----
    if (/^\/(대화|ai|c)\s*$/i.test(text)) {
      props.setProperty('MODE', 'chat');
      props.deleteProperty('CHAT_HISTORY');
      sendTelegram(chatId, '💬 대화 모드 시작! 이제 보내는 메시지는 AI와의 대화로 처리돼요 (이전 대화 기억함).\n끝내려면 "/종료" 라고 보내주세요. (/분석, 링크 저장은 대화 모드 중에도 그대로 작동해요)');
      return HtmlService.createHtmlOutput('ok');
    }
    if (/^\/(종료|그만|e)\s*$/i.test(text)) {
      props.setProperty('MODE', 'normal');
      props.deleteProperty('CHAT_HISTORY');
      sendTelegram(chatId, '✅ 대화 모드 종료! 다시 평소처럼 링크 저장 / 아이디어 분석 모드로 돌아갑니다.');
      return HtmlService.createHtmlOutput('ok');
    }

    var sheet = getSheet();
    var analyzeMatch = text.match(/^\/(분석|analyze|a)\s*([\s\S]*)$/i);

    if (analyzeMatch) {
      var link = (analyzeMatch[2] || '').trim();
      if (!link && message.reply_to_message) {
        var replyText = message.reply_to_message.text || message.reply_to_message.caption || '';
        link = extractYoutubeUrl(replyText) || replyText;
      }
      if (!link || !/youtu\.?be/i.test(link)) {
        sendTelegram(chatId, '⚠️ 분석할 유튜브 링크를 못 찾았어요.\n"/분석 <링크>" 로 보내거나, 저장된 링크 메시지에 답장으로 "/분석" 을 보내주세요.');
        return HtmlService.createHtmlOutput('ok');
      }
      sendTelegram(chatId, '🎬 영상을 직접 보고 분석 중... (1~2분 걸릴 수 있어요)');
      var result = processYoutube(link);
      upsertProcessedRow(sheet, 'youtube', link, chatId, result);
      sendTelegram(chatId, result.reply);
      return HtmlService.createHtmlOutput('ok');
    }

    if (text.charAt(0) === '/') {
      // 모르는 명령어를 조용히 무시하면 "무반응"으로 보이므로 안내를 보냄 (/start 제외)
      if (!/^\/start\b/i.test(text)) {
        sendTelegram(chatId,
          '❓ 모르는 명령어예요: "' + text + '"\n\n사용 가능한 명령어:\n' +
          '🔍 /분석 <링크>  (또는 저장된 링크에 답장으로 /분석)\n' +
          '💬 /대화  — AI 대화 모드 시작\n' +
          '✅ /종료  — 대화 모드 끝내기');
      }
      return HtmlService.createHtmlOutput('ok');
    }

    var isYoutube = /youtu\.?be/i.test(text);

    if (isYoutube) {
      // 링크만 보낸 경우 → 가볍게 "나중에 볼 영상"으로 저장만, 분석은 안 함 (대화 모드 중에도 항상 이 동작)
      var meta = fetchYoutubeMeta(text);
      sheet.appendRow([new Date(), 'youtube', text, meta.title, 'watch_only', '', '', chatId]);
      sendTelegram(chatId,
        '📺 나중에 볼 영상으로 저장했어요.\n📌 ' + meta.title +
        '\n🔗 ' + text +
        '\n\n분석 원하면 이 메시지에 답장으로 "/분석" 이라고 보내주세요.');
      return HtmlService.createHtmlOutput('ok');
    }

    // ---- 대화 모드 중이면 나머지 일반 텍스트를 전부 AI 대화로 처리 ----
    if (props.getProperty('MODE') === 'chat') {
      var chatReply = chatWithGemini(text);
      sendTelegram(chatId, chatReply);
      return HtmlService.createHtmlOutput('ok');
    }

    // 링크가 아닌 일반 텍스트 → 아이디어로 자동 분석
    sendTelegram(chatId, '🔎 분석 중...');
    var ideaResult = processIdea(text);
    sheet.appendRow([new Date(), 'idea', text, ideaResult.title, 'processed', ideaResult.summary, ideaResult.tags, chatId]);
    sendTelegram(chatId, ideaResult.reply);
  } catch (err) {
    // 조용히 죽지 않도록, 에러 내용을 텔레그램으로 알려줌
    Logger.log(err);
    try {
      var errOwner = PropertiesService.getScriptProperties().getProperty('OWNER_CHAT_ID');
      if (errOwner) {
        sendTelegram(errOwner, '⚠️ 처리 중 오류가 났어요:\n' + (err && err.message ? err.message : String(err)));
      }
    } catch (e2) {}
  }
  return HtmlService.createHtmlOutput('ok');
}

// 시트 이름이 바뀌어도 동작하도록: 지정한 이름이 없으면 첫 번째 탭을 사용
function getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

function sendTelegram(chatId, text) {
  var token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  // 텔레그램 메시지는 4096자 제한이 있어서, 넘으면 잘라서 나눠 보냄
  var chunks = [];
  var t = text;
  while (t.length > 3900) {
    chunks.push(t.slice(0, 3900));
    t = t.slice(3900);
  }
  chunks.push(t);
  chunks.forEach(function (chunk) {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, text: chunk }),
      muteHttpExceptions: true
    });
  });
}

// 링크로 기존에 "watch_only" 저장된 행이 있으면 그 행을 업데이트, 없으면 새로 추가
function upsertProcessedRow(sheet, type, content, chatId, result) {
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][2] === content) {
      sheet.getRange(i + 1, 4).setValue(result.title);
      sheet.getRange(i + 1, 5).setValue('processed');
      sheet.getRange(i + 1, 6).setValue(result.summary);
      sheet.getRange(i + 1, 7).setValue(result.tags);
      return;
    }
  }
  sheet.appendRow([new Date(), type, content, result.title, 'processed', result.summary, result.tags, chatId]);
}

// ---------- 초기 세팅: 웹앱 배포 후 딱 1번 실행 ----------
function setupWebhook() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('BOT_TOKEN');
  var webappUrl = props.getProperty('WEBAPP_URL');
  if (!token || !webappUrl) {
    throw new Error('스크립트 속성에 BOT_TOKEN, WEBAPP_URL을 먼저 넣어주세요.');
  }
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/setWebhook?url=' + encodeURIComponent(webappUrl));
  Logger.log(res.getContentText());
}

// ---------- 매일 밤 리캡: 시간 트리거로 실행 ----------
function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyDigest') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyDigest').timeBased().everyDays(1).atHour(23).create();
}

function dailyDigest() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var ownerId = PropertiesService.getScriptProperties().getProperty('OWNER_CHAT_ID');
  if (!ownerId) return;

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var analyzed = [];
  var watchOnly = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var ts = new Date(row[0]);
    if (ts >= today) {
      if (row[4] === 'processed') {
        analyzed.push({ type: row[1], title: row[3], tags: row[6], content: row[2] });
      } else if (row[4] === 'watch_only') {
        watchOnly.push({ title: row[3], content: row[2] });
      }
    }
  }

  if (analyzed.length === 0 && watchOnly.length === 0) return;

  var lines = ['📚 오늘의 레퍼런스 리캡', ''];
  if (analyzed.length) {
    lines.push('🔍 분석 완료 (' + analyzed.length + '건)');
    analyzed.forEach(function (p, idx) {
      lines.push((idx + 1) + '. [' + (p.type === 'youtube' ? '유튜브' : '아이디어') + '] ' + (p.title || p.content));
      if (p.tags) lines.push('   #' + String(p.tags).replace(/,\s*/g, ' #'));
    });
    lines.push('');
  }
  if (watchOnly.length) {
    lines.push('📺 저장만 해둔 영상 (' + watchOnly.length + '건, 답장으로 /분석 보내면 분석돼요)');
    watchOnly.forEach(function (p, idx) {
      lines.push((idx + 1) + '. ' + (p.title || p.content));
    });
  }

  sendTelegram(ownerId, lines.join('\n'));
}

function fetchYoutubeMeta(url) {
  var title = url, channel = '';
  try {
    var oembed = UrlFetchApp.fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent(url) + '&format=json', { muteHttpExceptions: true });
    if (oembed.getResponseCode() === 200) {
      var json = JSON.parse(oembed.getContentText());
      title = json.title;
      channel = json.author_name;
    }
  } catch (e) {}
  return { title: title + (channel ? ' - ' + channel : ''), channel: channel, rawTitle: title };
}

// 쇼츠/단축 URL을 Gemini가 확실히 인식하는 표준 형태로 변환 (추적 파라미터 제거)
function toWatchUrl(url) {
  var id = extractVideoId(url);
  return id ? 'https://www.youtube.com/watch?v=' + id : url;
}

function processYoutube(url) {
  var meta = fetchYoutubeMeta(url);
  var title = meta.rawTitle, channel = meta.channel;
  var watchUrl = toWatchUrl(url);

  var basePrompt = PropertiesService.getScriptProperties().getProperty('YOUTUBE_PROMPT') || DEFAULT_YOUTUBE_PROMPT;
  var formatSpec = '\n\n위 분석을 다 작성한 다음, 맨 마지막 줄에 별도로 이 형식 한 줄을 추가해줘 (분석 본문과 구분되게):\nTAGS: 쉼표로 구분된 태그 3~5개';

  // ===== 2단계 분리 방식 (Google 공식 권장) =====
  // 영상+복잡한 프롬프트를 한번에 보내면 모델이 혼란에 빠져 엉뚱한 분석을 함.
  // Step 1: 영상만 보고 대사/내용을 정확히 받아쓰기 (간단한 프롬프트)
  // Step 2: 받아쓴 내용을 텍스트로 넣고 헌법 프롬프트로 분석 (영상 없이)

  var transcript = '';
  var mode = '';

  // Step 1: 영상에서 대사/내용 추출 (간결한 프롬프트 + 영상)
  var step1Prompt =
    '이 유튜브 영상을 처음부터 끝까지 꼼꼼히 보고, 아래 내용을 빠짐없이 정리해줘.\n\n' +
    '1) 등장인물: 누가 나오는지 (이름, 역할, 관계)\n' +
    '2) 전체 대사: 모든 대사를 순서대로 그대로 받아써. 누가 말했는지 표시.\n' +
    '3) 화면 묘사: 주요 장면이나 자막, 텍스트, 반전 포인트 등 시각적으로 중요한 것.\n' +
    '4) 전체 줄거리: 처음부터 끝까지 무슨 일이 벌어지는지 시간순으로 정리.\n\n' +
    '추측하지 말고 실제 영상에서 보이고 들리는 것만 써. 빠뜨리지 마.';

  var step1Result = callGeminiWithVideo(step1Prompt, watchUrl);

  if (step1Result.indexOf('__GEMINI_ERROR__') !== 0 && step1Result.length > 50) {
    // Step 1 성공 → Step 2: 추출된 내용으로 헌법 분석 (텍스트 전용, 영상 없이)
    transcript = step1Result;
    mode = '🎬 영상 직접 시청 → 2단계 분석';
  } else {
    // Step 1 실패 → 자막 스크래핑 시도
    var videoErr = step1Result.indexOf('__GEMINI_ERROR__') === 0
      ? step1Result.replace('__GEMINI_ERROR__', '')
      : '영상 내용 추출 불충분';
    transcript = fetchYoutubeTranscript(url);
    if (transcript) {
      mode = '📝 자막 기반 분석 (영상 직접 분석 실패: ' + videoErr + ')';
    } else {
      mode = '⚠️ 제목 기반 추정 (영상·자막 모두 실패: ' + videoErr + ')';
    }
  }

  // Step 2: 추출된 텍스트 기반으로 헌법 분석 (영상 없이, 텍스트만)
  var analysisPrompt = basePrompt
    .replace(/{{TITLE}}/g, title)
    .replace(/{{CHANNEL}}/g, channel)
    .replace(/{{TRANSCRIPT}}/g, transcript || '(자막을 가져오지 못했습니다 - 제목/채널 정보만으로 추정해서 분석해줘)');

  var ai = callGemini(analysisPrompt + formatSpec);

  var tagsMatch = ai.match(/TAGS:\s*(.*)/i);
  var tags = tagsMatch ? tagsMatch[1].trim() : '';
  var bodyText = ai.replace(/\n?TAGS:\s*.*/i, '').trim();

  var reply = '✅ 분석 완료 (유튜브)\n📌 ' + meta.title +
    '\n' + mode +
    '\n\n' + bodyText +
    (tags ? '\n\n🏷️ #' + tags.replace(/,\s*/g, ' #') : '');

  return { title: meta.title, summary: bodyText, tags: tags, reply: reply };
}

function processIdea(text) {
  var basePrompt = PropertiesService.getScriptProperties().getProperty('IDEA_PROMPT') || DEFAULT_IDEA_PROMPT;
  var filled = basePrompt.replace(/{{TEXT}}/g, text);
  var formatSpec =
    '\n\n반드시 아래 형식으로만, 각 항목 한 줄씩 한국어로 답해줘 (다른 설명 없이):\n' +
    'SUMMARY: 핵심을 다듬은 한두 문장\n' +
    'TAGS: 쉼표로 구분된 분류 태그 2~4개';

  var ai = callGemini(filled + formatSpec);
  var f = parseFields(ai, ['SUMMARY', 'TAGS']);

  var reply = '✅ 저장 + 분석 완료 (아이디어)\n' +
    '📌 ' + text.slice(0, 30) + '\n\n' +
    (f.SUMMARY ? '💡 ' + f.SUMMARY + '\n' : '') +
    (f.TAGS ? '🏷️ #' + f.TAGS.replace(/,\s*/g, ' #') : '');

  return { title: text.slice(0, 30), summary: f.SUMMARY || '', tags: f.TAGS || '', reply: reply };
}

// ---------- 유튜브 자막(자동생성 포함) 가져오기 - 비공식 방식, 실패할 수 있음 ----------
function extractYoutubeUrl(text) {
  var m = text.match(/https?:\/\/(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))[^\s]+/i);
  return m ? m[0] : '';
}

function extractVideoId(url) {
  var m = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function fetchYoutubeTranscript(url) {
  try {
    var videoId = extractVideoId(url);
    if (!videoId) return '';

    var pageRes = UrlFetchApp.fetch('https://www.youtube.com/watch?v=' + videoId + '&hl=ko', { muteHttpExceptions: true });
    var html = pageRes.getContentText();
    var match = html.match(/"captionTracks":(\[.*?\])/);
    if (!match) return '';

    var tracks = JSON.parse(match[1].replace(/\\u0026/g, '&'));
    if (!tracks || !tracks.length) return '';

    var track = null;
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].languageCode === 'ko') { track = tracks[i]; break; }
    }
    if (!track) track = tracks[0];

    var capRes = UrlFetchApp.fetch(track.baseUrl, { muteHttpExceptions: true });
    var xml = capRes.getContentText();

    var texts = [];
    var re = /<text[^>]*>([\s\S]*?)<\/text>/g;
    var m2;
    while ((m2 = re.exec(xml)) !== null) {
      var t = m2[1]
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      texts.push(t);
    }
    var full = texts.join(' ');
    return full.length > 12000 ? full.slice(0, 12000) + ' ...(자막 길어서 일부 생략)' : full;
  } catch (e) {
    return '';
  }
}

// 여러 개의 "필드명: 값" 라인을 한번에 파싱
function parseFields(text, fieldNames) {
  var result = {};
  fieldNames.forEach(function (name) {
    var re = new RegExp(name + ':\\s*(.*)', 'i');
    var m = text.match(re);
    result[name] = m ? m[1].trim() : '';
  });
  return result;
}

// ---------- 대화 모드: 기억을 유지하는 일반 채팅 ----------
function chatWithGemini(text) {
  var props = PropertiesService.getScriptProperties();
  var historyRaw = props.getProperty('CHAT_HISTORY');
  var history = historyRaw ? JSON.parse(historyRaw) : [];

  history.push({ role: 'user', text: text });

  var contents = history.map(function (h) {
    return { role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] };
  });

  var r = geminiRequest({ contents: contents });
  var replyText = r.ok ? r.text : '⚠️ ' + r.error;

  history.push({ role: 'model', text: replyText });
  // 대화가 너무 길어지지 않게 최근 12개(6턴)만 유지
  if (history.length > 12) history = history.slice(history.length - 12);
  props.setProperty('CHAT_HISTORY', JSON.stringify(history));

  return replyText;
}

/**
 * Gemini 호출 공통 함수.
 * 503(과부하)/429(한도)/500 같은 일시적 오류는 잠시 쉬었다 재시도하고,
 * 그래도 안 되면 대체 모델로 한 번 더 시도한다.
 * 반환: { ok: true, text: '...' } 또는 { ok: false, error: '사유' }
 */
function geminiRequest(payload) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return { ok: false, error: 'GEMINI_API_KEY 미설정' };

  var models = [GEMINI_MODEL].concat(GEMINI_FALLBACK_MODELS);
  var waits = [3000, 8000]; // 재시도 전 대기(ms)
  var lastError = '';

  for (var m = 0; m < models.length; m++) {
    // 첫 모델만 재시도까지 하고, 대체 모델은 한 번씩만 시도 (전체 시간이 너무 길어지지 않게)
    var maxAttempt = (m === 0) ? waits.length : 0;
    for (var attempt = 0; attempt <= maxAttempt; attempt++) {
      var res = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + models[m] + ':generateContent?key=' + apiKey,
        {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        }
      );

      var code = res.getResponseCode();
      var body = res.getContentText();

      if (code === 200) {
        try {
          var json = JSON.parse(body);
          if (json.error) {
            lastError = 'HTTP 200이지만 오류: ' + json.error.message;
            break;
          }
          var text = (json.candidates[0].content.parts || [])
            .map(function (p) { return p.text || ''; })
            .join('');
          if (text) return { ok: true, text: text, model: models[m] };
          lastError = '빈 응답 (' + models[m] + ')';
          break;
        } catch (e) {
          lastError = '응답 파싱 실패: ' + body.slice(0, 150);
          break;
        }
      }

      lastError = 'HTTP ' + code + ' (' + models[m] + ') ' + body.slice(0, 150);

      // 일시적 오류면 잠시 쉬었다 재시도, 그 외(400/403 등)는 즉시 다음 모델로
      var retryable = (code === 503 || code === 429 || code === 500 || code === 504);
      if (!retryable) break;
      if (attempt < maxAttempt) Utilities.sleep(waits[attempt]);
    }
  }

  return { ok: false, error: lastError };
}

// 유튜브 영상 자체를 Gemini에 넣어서 분석 (화면 1프레임/초 + 음성 전사)
// 실패하면 '__GEMINI_ERROR__사유' 형태로 반환해서 호출부가 대체 경로를 타게 함
function callGeminiWithVideo(prompt, youtubeUrl) {
  var r = geminiRequest({
    contents: [{
      parts: [
        { text: prompt },
        { file_data: { file_uri: youtubeUrl } }
      ]
    }]
  });
  return r.ok ? r.text : '__GEMINI_ERROR__' + r.error;
}

function callGemini(prompt) {
  var r = geminiRequest({ contents: [{ parts: [{ text: prompt }] }] });
  return r.ok ? r.text : 'SUMMARY: (분석 실패 - ' + r.error + ')\nTAGS: ';
}

// ---------- 진단용 테스트 함수 (문제 없으면 지워도 됨) ----------
function testGeminiRaw() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + apiKey, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ contents: [{ parts: [{ text: '안녕' }] }] }),
    muteHttpExceptions: true
  });
  Logger.log('CODE: ' + res.getResponseCode());
  Logger.log('BODY: ' + res.getContentText());
}

function testDoPost() {
  var ownerId = PropertiesService.getScriptProperties().getProperty('OWNER_CHAT_ID');
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        message: {
          chat: { id: Number(ownerId) },
          text: 'https://youtu.be/dQw4w9WgXcQ'
        }
      })
    }
  };
  var result = doPost(fakeEvent);
  Logger.log('doPost 반환값: ' + result.getContent());
}

function testAnalyzeReply() {
  var ownerId = PropertiesService.getScriptProperties().getProperty('OWNER_CHAT_ID');
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        message: {
          chat: { id: Number(ownerId) },
          text: '/분석',
          reply_to_message: {
            text: '📺 나중에 볼 영상으로 저장했어요.\n📌 요즘 학교 일진들이 절대 건드리지 않는 선 - 슈무\n🔗 https://youtube.com/shorts/eHUj-M6J6-U?si=AwiHDfhmD-mPKBND\n\n분석 원하면 이 메시지에 답장으로 "/분석" 이라고 보내주세요.'
          }
        }
      })
    }
  };
  var result = doPost(fakeEvent);
  Logger.log('결과: ' + result.getContent());
}

// 2단계 분리 분석이 제대로 되는지 검증 (아래 URL만 바꿔서 실행)
function testVideoAnalysis() {
  var url = 'https://youtube.com/shorts/O3W-5tmzTc8';
  Logger.log('=== 2단계 분리 분석 테스트 ===');
  Logger.log('테스트 URL: ' + url);
  var result = processYoutube(url);
  Logger.log('분석 모드: ' + (result.reply.match(/🎬.*|📝.*|⚠️.*/)?.[0] || '?'));
  Logger.log('분석 결과:\n' + result.reply.slice(0, 2000));
}

// 현재 상태를 한눈에 점검 (문제 생기면 이걸 먼저 실행)
function diagnose() {
  var props = PropertiesService.getScriptProperties();
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var names = ss.getSheets().map(function (s) { return s.getName(); });
  Logger.log('스프레드시트 탭 목록: ' + JSON.stringify(names));
  Logger.log('코드가 찾는 이름(SHEET_NAME): ' + SHEET_NAME);
  Logger.log('getSheetByName 결과: ' + (ss.getSheetByName(SHEET_NAME) ? '찾음 ✅' : '못 찾음 → 첫 탭으로 대체됨 ⚠️'));
  Logger.log('실제 사용할 탭: ' + getSheet().getName());
  Logger.log('OWNER_CHAT_ID: ' + props.getProperty('OWNER_CHAT_ID'));
  Logger.log('MODE: ' + (props.getProperty('MODE') || '(없음=일반모드)'));
  Logger.log('LAST_UPDATE_ID: ' + (props.getProperty('LAST_UPDATE_ID') || '(없음)'));
  Logger.log('BOT_TOKEN 있음: ' + (props.getProperty('BOT_TOKEN') ? 'O' : 'X'));
  Logger.log('GEMINI_API_KEY 있음: ' + (props.getProperty('GEMINI_API_KEY') ? 'O' : 'X'));
}

// 중복방지/모드 상태를 초기화 (봇이 아무 반응 없을 때 사용)
function resetState() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('LAST_UPDATE_ID');
  props.deleteProperty('MODE');
  props.deleteProperty('CHAT_HISTORY');
  Logger.log('상태 초기화 완료 (LAST_UPDATE_ID, MODE, CHAT_HISTORY 삭제)');
}

function checkWebhookInfo() {
  var token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getWebhookInfo');
  Logger.log(res.getContentText());
}

function resetWebhook() {
  var token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  var webappUrl = PropertiesService.getScriptProperties().getProperty('WEBAPP_URL');
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/setWebhook?url=' + encodeURIComponent(webappUrl) + '&drop_pending_updates=true');
  Logger.log(res.getContentText());
}
