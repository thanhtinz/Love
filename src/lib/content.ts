import { LetterMoment, Rarity, PersonId, today, uid } from "./types";

/**
 * Nội dung tĩnh của bản rebuild: 12 mặt mood (cho Note tình yêu) + kho 36 thông
 * điệp thư tình. Thư ở bản này CHỈ là khoảnh khắc pop-up khi chăm cây (ngẫu
 * nhiên / combo Song chăm / lên giai đoạn / mốc chăm) — không hộp thư, không
 * sưu tập, không màn hình riêng.
 */

/* ---------- Mood (tranh thật ở assets/art/moods) ---------- */
export const MOODS: { id: string; label: string }[] = [
  { id: "joy", label: "Vui vẻ" },
  { id: "love", label: "Đang yêu đời" },
  { id: "heartEyes", label: "Mê mẩn" },
  { id: "sleepy", label: "Buồn ngủ" },
  { id: "pleading", label: "Nhõng nhẽo" },
  { id: "huff", label: "Hờn dỗi" },
  { id: "sick", label: "Bị ốm" },
  { id: "celebrate", label: "Ăn mừng" },
  { id: "calm", label: "Thư giãn" },
  { id: "excited", label: "Phấn khích" },
  { id: "sad", label: "Hơi buồn" },
  { id: "energetic", label: "Tràn năng lượng" },
];
export const moodLabel = (id: string): string => MOODS.find((m) => m.id === id)?.label || id;
export const isMoodId = (id: unknown): id is string => typeof id === "string" && MOODS.some((m) => m.id === id);

/* ---------- Kho 36 thông điệp thư tình (3 độ hiếm) ---------- */
export interface LoveMessage { id: number; text: string; rarity: Rarity }
export const LOVE_MESSAGES: LoveMessage[] = [
  { id: 1, text: "Mỗi ngày có em/anh bên cạnh đều là một ngày đáng yêu hơn hôm qua một chút.", rarity: "common" },
  { id: 2, text: "Cảm ơn vì đã luôn ở đây, dù chỉ là một tin nhắn chào buổi sáng.", rarity: "common" },
  { id: 3, text: "Nụ cười của em/anh là nắng của khu vườn này đó.", rarity: "common" },
  { id: 4, text: "Ở bên nhau không cần hoàn hảo, chỉ cần thật lòng.", rarity: "common" },
  { id: 5, text: "Hôm nay mệt thì tựa vào vai nhau một lát nhé.", rarity: "common" },
  { id: 6, text: "Tình yêu lớn lên từ những điều nhỏ bé mình làm cho nhau mỗi ngày.", rarity: "common" },
  { id: 7, text: "Em/Anh là lý do chiếc cây này xanh tốt như vậy.", rarity: "common" },
  { id: 8, text: "Chỉ cần hai đứa cùng tưới, cây nào rồi cũng sẽ nở hoa.", rarity: "common" },
  { id: 9, text: "Yêu là cùng nhau lớn lên, như cây này vậy.", rarity: "common" },
  { id: 10, text: "Một cái ôm hôm nay đáng giá hơn ngàn lời nói.", rarity: "common" },
  { id: 11, text: "Cảm ơn vì đã chọn nhau, hết lần này đến lần khác.", rarity: "common" },
  { id: 12, text: "Bình yên nhất là khi được ở cạnh người mình thương.", rarity: "common" },
  { id: 13, text: "Dù bận đến đâu, đừng quên nói lời yêu thương nhé.", rarity: "common" },
  { id: 14, text: "Em/Anh làm cho những ngày bình thường trở nên đặc biệt.", rarity: "common" },
  { id: 15, text: "Hai trái tim, một khu vườn, một hành trình dài.", rarity: "common" },
  { id: 16, text: "Khoảnh khắc đẹp nhất là khoảnh khắc có nhau.", rarity: "common" },
  { id: 17, text: "Yêu thương không cần ồn ào, chỉ cần đều đặn như tưới cây.", rarity: "common" },
  { id: 18, text: "Hôm nay cũng thương nhau nhiều hơn hôm qua nhé.", rarity: "common" },
  { id: 19, text: "SONG CHĂM: Khi hai trái tim cùng đập một nhịp, cả khu vườn bừng sáng. Hai đứa vừa tạo ra khoảnh khắc hiếm có đó!", rarity: "rare" },
  { id: 20, text: "Người ta nói tình yêu đẹp nhất là khi cả hai cùng cố gắng — và hai đứa đang làm đúng như vậy.", rarity: "rare" },
  { id: 21, text: "Mốc chăm sóc này chứng minh: yêu thương của hai đứa không phải cảm xúc nhất thời, mà là thói quen bền bỉ.", rarity: "rare" },
  { id: 22, text: "Có những người đi qua đời nhau như gió, còn hai đứa chọn ở lại và cùng nhau bén rễ.", rarity: "rare" },
  { id: 23, text: "Nếu tình yêu là một khu vườn, hai đứa là hai người làm vườn tận tâm nhất thế gian.", rarity: "rare" },
  { id: 24, text: "Khoảnh khắc cả hai cùng chăm cây là minh chứng: khoảng cách nào cũng thua sự đồng lòng.", rarity: "rare" },
  { id: 25, text: "Chúc mừng cột mốc mới! Mỗi lần chăm là một lời hứa thầm lặng: mình sẽ không bỏ cuộc.", rarity: "rare" },
  { id: 26, text: "Tình yêu của hai đứa vừa lên một nấc thang mới — rực rỡ và đáng tự hào.", rarity: "rare" },
  { id: 27, text: "Hai bàn tay cùng vun trồng thì không có mùa đông nào làm cây héo được.", rarity: "rare" },
  { id: 28, text: "Thư hiếm này chỉ xuất hiện khi hai đứa thật sự đồng điệu. Giữ chặt nhau nhé!", rarity: "rare" },
  { id: 29, text: "HUYỀN THOẠI: Cây đã nở hoa! Tình yêu của hai đứa đã đi từ hạt mầm thành một khu vườn rực rỡ — đây là điều rất ít cặp đôi làm được.", rarity: "legendary" },
  { id: 30, text: "HUYỀN THOẠI: Dưới tán cây trái tim này, hãy hứa với nhau: dù bão giông, mình vẫn cùng nhau che chở.", rarity: "legendary" },
  { id: 31, text: "HUYỀN THOẠI: Em/Anh là định mệnh đẹp nhất. Cây trái tim này là chứng nhân cho một tình yêu phi thường.", rarity: "legendary" },
  { id: 32, text: "HUYỀN THOẠI: Từ một hạt giống nhỏ, hai đứa đã trồng nên cả một bầu trời yêu thương. Tự hào về hai đứa lắm!", rarity: "legendary" },
  { id: 33, text: "HUYỀN THOẠI: Người đời tìm kiếm phép màu, còn phép màu của hai đứa chính là nhau.", rarity: "legendary" },
  { id: 34, text: "HUYỀN THOẠI: Nếu viết thành sách, câu chuyện của hai đứa sẽ là chương đẹp nhất — và cây này là trang bìa lấp lánh.", rarity: "legendary" },
  { id: 35, text: "HUYỀN THOẠI: Yêu đến mức làm cây kết trái tim — cấp độ này chỉ dành cho những trái tim kiên định nhất.", rarity: "legendary" },
  { id: 36, text: "HUYỀN THOẠI: Mãi mãi không phải là lời hứa suông, mà là từng ngày hai đứa đã, đang và sẽ chăm sóc nhau như hôm nay.", rarity: "legendary" },
];
export const messageById = (id: number): LoveMessage => LOVE_MESSAGES.find((m) => m.id === id) || LOVE_MESSAGES[0];

/* ---------- Chọn thư: ngẫu nhiên (máy người chăm tự rút) + xác định theo seed ---------- */
/** Hash chuỗi xác định (FNV-1a) — 2 máy cùng khóa luôn ra cùng kết quả. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function seeded01(seedKey: string): number {
  return hashString(seedKey) / 4294967296;
}
export function pickMessage(rarity: Rarity): LoveMessage {
  const pool = LOVE_MESSAGES.filter((m) => m.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}
export function pickMessageSeeded(rarity: Rarity, seedKey: string): LoveMessage {
  const pool = LOVE_MESSAGES.filter((m) => m.rarity === rarity);
  return pool[hashString(seedKey) % pool.length];
}

/** Dựng một khoảnh khắc thư rơi (máy gây ra sự kiện tạo, ghi vào state cho cả 2 máy cùng thấy). */
export function makeLetterMoment(rarity: Rarity, source: string, bySlot: PersonId, atIso: string): LetterMoment {
  const msg = pickMessage(rarity);
  return { id: uid(), messageId: msg.id, rarity, source, at: atIso, bySlot };
}

/* ---------- Câu tình hôm nay — XÁC ĐỊNH theo ngày địa phương ---------- */
/**
 * 30 câu tình ngắn hiện dưới bộ đếm ngày ở Trang Nhà (đợt "chất app" 1).
 * Chọn theo hash của khóa ngày (dayKeyLocal) nên CẢ 2 MÁY luôn thấy cùng một
 * câu trong cùng một ngày — không lưu state, không đồng bộ gì thêm.
 */
export const DAILY_QUOTES: string[] = [
  "Ngày nào có nhau, ngày đó là ngày đẹp.",
  "Thương nhau là việc nhỏ làm đều mỗi ngày.",
  "Chỉ cần còn nắm tay nhau, mùa nào cũng là mùa xuân.",
  "Bình yên là khi biết có một người luôn ở phía mình.",
  "Hai đứa, một khu vườn — cứ tưới là cứ xanh.",
  "Ở bên nhau lâu không khó, khó là mỗi ngày vẫn chọn nhau.",
  "Một tin nhắn nhỏ cũng đủ làm ngày của nhau sáng lên.",
  "Yêu xa hay gần, quan trọng là lòng vẫn hướng về nhau.",
  "Cảm ơn vì hôm nay vẫn là nhau.",
  "Điều lãng mạn nhất là sự đều đặn: chào buổi sáng, chúc ngủ ngon.",
  "Tình yêu lớn lên từ những lần quan tâm không cần lý do.",
  "Có nhau rồi, những ngày bình thường cũng hóa đặc biệt.",
  "Nắng có lúc tắt, nhưng việc thương nhau thì không nghỉ ngày nào.",
  "Hai trái tim chung một nhịp là đủ ấm cả ngày.",
  "Đi chậm cũng được, miễn là đi cùng nhau.",
  "Một cái ôm đúng lúc đáng giá hơn trăm lời hoa mỹ.",
  "Yêu là khi niềm vui của người kia cũng là niềm vui của mình.",
  "Giữ nhau bằng những điều tử tế nhỏ xíu mỗi ngày.",
  "Hôm nay cũng thương nhau nhiều hơn hôm qua một chút nhé.",
  "Khu vườn này xanh vì có hai người cùng chăm — tình yêu cũng vậy.",
  "Chẳng cần hoàn hảo, chỉ cần thật lòng và ở lại.",
  "Mỗi ngày bên nhau là một trang nữa của câu chuyện đẹp nhất.",
  "Thương là nhớ nhau ngay cả khi đang bận rộn nhất.",
  "Có một người để nhớ, để chờ, để kể chuyện cuối ngày — thế là đủ.",
  "Tình yêu không ồn ào; nó là tiếng nhịp đều đặn mỗi ngày.",
  "Nắm tay nhau qua ngày thường mới là lãng mạn bền nhất.",
  "Dù hôm nay thế nào, có nhau là có nhà.",
  "Một lời yêu đúng lúc làm mềm cả một ngày cứng.",
  "Hai đứa mình là bằng chứng: điều nhỏ làm đều sẽ thành điều lớn.",
  "Mai này nhìn lại, những ngày như hôm nay là những ngày đẹp nhất.",
];
export function dailyQuote(dayKey: string = today()): string {
  return DAILY_QUOTES[hashString(`daily-quote-${dayKey}`) % DAILY_QUOTES.length];
}

/* ---------- Lời chào theo buổi — gọi tên CẢ HAI người ---------- */
export type DayPart = "sang" | "trua" | "chieu" | "toi";
export function dayPartForHour(hour: number): DayPart {
  if (hour >= 5 && hour < 11) return "sang";
  if (hour >= 11 && hour < 14) return "trua";
  if (hour >= 14 && hour < 19) return "chieu";
  return "toi";
}
/** Lời chào ở card "Hôm nay" (Trang Nhà): deterministic theo giờ địa phương. */
export function greetingLine(hour: number, selfName: string, partnerName: string): string {
  switch (dayPartForHour(hour)) {
    case "sang":
      return `Chào buổi sáng, ${selfName}. ${partnerName} đang ở ngay đây thôi — bắt đầu ngày mới cùng nhau nhé.`;
    case "trua":
      return `Chào buổi trưa, ${selfName}. Nhớ nghỉ ngơi một chút, ${partnerName} đang nhớ bạn đó.`;
    case "chieu":
      return `Chào buổi chiều, ${selfName}. Thêm một buổi nữa bên nhau rồi — ${partnerName} vẫn ở ngay đây thôi.`;
    default:
      return `Tối rồi, ${selfName}. ${partnerName} đang ở ngay đây thôi — khép lại ngày dài bên nhau nhé.`;
  }
}

/**
 * Thư mừng LÊN GIAI ĐOẠN — XÁC ĐỊNH hoàn toàn theo giai đoạn: cả 2 máy cùng phát
 * hiện cây lên giai đoạn (qua thời gian thật) sẽ tạo CÙNG id + CÙNG nội dung, nên
 * merge không bao giờ ra 2 lá thư khác nhau cho cùng một sự kiện.
 * Độ hiếm: Hiếm; riêng lần trưởng thành (giai đoạn cuối) 50% Huyền thoại theo seed.
 */
export function makeStageUpLetter(stageIndex: number, mature: boolean, bySlot: PersonId, atIso: string): LetterMoment {
  const seed = `stageup-${stageIndex}`;
  const rarity: Rarity = mature && seeded01(seed + ":mature") < 0.5 ? "legendary" : "rare";
  const msg = pickMessageSeeded(rarity, seed);
  return { id: seed, messageId: msg.id, rarity, source: mature ? "Cây trưởng thành" : "Lên giai đoạn mới", at: atIso, bySlot };
}
