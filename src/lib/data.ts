// Port noi dung tu ban web (lib/data.ts) — da loc emoji; icon dung ten Ionicons cua @expo/vector-icons.
import type { ShopCategory } from "./types";

export const QUESTIONS = [
  "Điều nhỏ bé nào của đối phương khiến bạn mỉm cười hôm nay?",
  "Kỷ niệm nào của hai đứa khiến bạn muốn quay lại nhất?",
  "Nếu được đi du lịch bất cứ đâu cùng nhau, bạn chọn nơi nào?",
  "Bạn biết ơn đối phương vì điều gì nhất tuần này?",
  "Món ăn nào bạn muốn cùng nhau nấu thử?",
  "Điều gì ở đối phương khiến bạn tự hào nhất?",
  "Ước mơ chung lớn nhất của hai đứa là gì?",
  "Lần đầu gặp nhau, bạn ấn tượng điều gì nhất?",
  "Bạn muốn nhận được cái ôm như thế nào khi mệt?",
  "Bài hát nào gợi nhớ về hai đứa mình nhất?",
  "Nếu có một ngày nghỉ hoàn hảo cùng nhau, hai đứa sẽ làm gì?",
  "Điều bạn muốn cùng nhau học trong năm nay là gì?",
  "Bạn thích được khen về điều gì nhất?",
  "Thói quen nhỏ nào của hai đứa bạn muốn giữ mãi?",
  "Nếu trúng số, điều đầu tiên hai đứa làm cùng nhau là gì?",
  "Bạn mong đối phương hiểu điều gì về bạn hơn?",
  "Buổi hẹn hò lý tưởng trong mơ của bạn là gì?",
  "Điều lãng mạn nhất đối phương từng làm cho bạn?",
  "Bạn muốn cùng nhau già đi như thế nào?",
  "Hôm nay bạn muốn nói lời yêu thương gì với đối phương?",
  "Nơi nào hai đứa nhất định phải đến trước năm sau?",
  "Bạn cảm thấy được yêu nhất khi đối phương làm gì?",
  "Nếu nuôi một thú cưng chung, bạn muốn nuôi con gì?",
  "Điều gì khiến bạn tin hai đứa sẽ đi đường dài?",
];
export interface DateIdea { icon: string; text: string }
export const DATE_IDEAS: DateIdea[] = [
  { icon: "document-text-outline", text: "Picnic công viên + bánh tự làm" },
  { icon: "flower-outline", text: "Cùng nhau vẽ tranh chibi tặng nhau" },
  { icon: "gift-outline", text: "Food tour chợ đêm, mỗi người chọn 3 món" },
  { icon: "home-outline", text: "Xem phim tại nhà + bắp rang + chăn ấm" },
  { icon: "camera-outline", text: "Chụp photobooth và in ảnh dán tường" },
  { icon: "sunny-outline", text: "Đạp xe quanh hồ lúc hoàng hôn" },
  { icon: "heart-outline", text: "Học làm bánh tại workshop" },
  { icon: "star-outline", text: "Ngắm sao + kể chuyện tuổi thơ" },
  { icon: "bag-handle-outline", text: "Thử thách: mua quà cho nhau dưới 100k" },
  { icon: "sparkles-outline", text: "Karaoke song ca bài tủ của hai đứa" },
  { icon: "flower-outline", text: "Đi vườn hoa / nông trại hái dâu" },
  { icon: "chatbubble-outline", text: "Cafe sách, đọc cho nhau nghe một chương" },
  { icon: "sunny-outline", text: "Đi biển, xây lâu đài cát hình trái tim" },
  { icon: "game-controller-outline", text: "Chơi game co-op cùng nhau cả buổi" },
  { icon: "send-outline", text: "Lên kế hoạch chuyến đi mơ ước trên giấy" },
];

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
export const NOTE_COLORS = ["#fbcfe8", "#fde68a", "#bae6fd", "#a7f3d0", "#ddd6fe", "#fecdd3"];
export function questionOfDay(date = new Date()) {
  const dayNum = Math.floor(date.getTime() / 86400000);
  return QUESTIONS[dayNum % QUESTIONS.length];
}

export interface LoveMessage { id: number; text: string; rarity: "common" | "rare" | "legendary" }
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
export function pickMessage(rarity: "common" | "rare" | "legendary", ownedIds: number[]): LoveMessage {
  const pool = LOVE_MESSAGES.filter((m) => m.rarity === rarity);
  const fresh = pool.filter((m) => !ownedIds.includes(m.id));
  const src = fresh.length ? fresh : pool;
  return src[Math.floor(Math.random() * src.length)];
}

export const QUESTS: { id: string; label: string; icon: string; target: number; key: "water" | "love" | "both"; rewardXp: number; rewardCoins: number }[] = [
  { id: "water3", label: "Tưới nước 3 lần hôm nay", icon: "water-outline", target: 3, key: "water", rewardXp: 15, rewardCoins: 20 },
  { id: "love2", label: "Bón tim 2 lần hôm nay", icon: "heart-outline", target: 2, key: "love", rewardXp: 15, rewardCoins: 20 },
  { id: "both", label: "Cả 2 người đều chăm cây hôm nay", icon: "people-outline", target: 2, key: "both", rewardXp: 20, rewardCoins: 20 },
];
export const ACHIEVEMENTS: { id: string; icon: string; label: string }[] = [
  { id: "first", icon: "leaf-outline", label: "Lần chăm đầu tiên" },
  { id: "combo", icon: "sparkles-outline", label: "Combo Song chăm đầu tiên" },
  { id: "care25", icon: "medal-outline", label: "Chăm cây 25 lần" },
  { id: "bloom", icon: "flower-outline", label: "Cây nở hoa" },
  { id: "hearttree", icon: "heart-outline", label: "Cây trái tim" },
  { id: "collector10", icon: "mail-outline", label: "Sưu tập 10 lá thư" },
  { id: "streak3", icon: "flame-outline", label: "Streak 3 ngày chăm cây" },
  { id: "questall", icon: "trophy-outline", label: "Hoàn thành hết nhiệm vụ ngày" },
  { id: "shopper", icon: "bag-handle-outline", label: "Mua món đồ đầu tiên ở cửa hàng" },
  { id: "memories3", icon: "camera-outline", label: "Lưu giữ 3 kỷ niệm" },
  { id: "firstMature", icon: "leaf-outline", label: "Cây trưởng thành đầu tiên" },
  { id: "species3", icon: "leaf-outline", label: "Trồng 3 loài cây khác nhau" },
  { id: "harvest1", icon: "gift-outline", label: "Thu hoạch dâu đầu tiên" },
];

/* ---------- Shop trang trí (màu hex cho RN) ---------- */
export interface ShopItem {
  id: string; category: ShopCategory; name: string; icon: string; price: number; desc: string;
  visual: string;
}
export const SHOP_ITEMS: ShopItem[] = [
  { id: "pot-basic", category: "pot", name: "Chậu đất nung", icon: "flower-outline", price: 0, desc: "Chậu mặc định mộc mạc, thân thuộc", visual: "#fb923c" },
  { id: "pot-blue", category: "pot", name: "Chậu gốm xanh", icon: "flower-outline", price: 60, desc: "Gốm xanh mát mắt như bầu trời", visual: "#38bdf8" },
  { id: "pot-pink", category: "pot", name: "Chậu hồng chibi", icon: "flower-outline", price: 90, desc: "Hồng pastel siêu cưng, hợp khu vườn nhất", visual: "#f472b6" },
  { id: "pot-gold", category: "pot", name: "Chậu vàng hoàng kim", icon: "diamond-outline", price: 180, desc: "Lấp lánh sang chảnh cho cây huyền thoại", visual: "#f59e0b" },
  { id: "scene-auto", category: "scene", name: "Theo giờ thật", icon: "time-outline", price: 0, desc: "Trời tự đổi sáng / chiều / tối theo đồng hồ thật", visual: "" },
  { id: "scene-sunset", category: "scene", name: "Hoàng hôn tím", icon: "sunny-outline", price: 80, desc: "Nhuộm cả khu vườn màu hoàng hôn lãng mạn", visual: "#ddd6fe" },
  { id: "scene-night", category: "scene", name: "Đêm đầy sao", icon: "moon-outline", price: 100, desc: "Bầu trời đêm, trăng sao và đom đóm", visual: "#312e81" },
  { id: "scene-rainbow", category: "scene", name: "Cầu vồng mơ mộng", icon: "rainbow-outline", price: 150, desc: "Pastel cầu vồng sau cơn mưa tình yêu", visual: "#fbcfe8" },
  { id: "acc-none", category: "accessory", name: "Không phụ kiện", icon: "ellipse-outline", price: 0, desc: "Để cây tự nhiên nhất", visual: "" },
  { id: "acc-bow", category: "accessory", name: "Nơ hồng", icon: "ribbon-outline", price: 40, desc: "Thắt nơ cho cây — món đầu tiên ai cũng mua được", visual: "bow" },
  { id: "acc-chime", category: "accessory", name: "Chuông gió", icon: "notifications-outline", price: 55, desc: "Chuông gió đung đưa kêu leng keng bên cây", visual: "chime" },
  { id: "acc-lantern", category: "accessory", name: "Đèn lồng", icon: "bulb-outline", price: 70, desc: "Đèn lồng ấm áp thắp sáng góc vườn", visual: "lantern" },
  { id: "acc-butterfly", category: "accessory", name: "Đàn bướm", icon: "bug-outline", price: 85, desc: "Thêm đàn bướm bay lượn quanh cây cả ngày", visual: "butterfly" },
];
export const shopItem = (id: string) => SHOP_ITEMS.find((i) => i.id === id) || SHOP_ITEMS[0];

export function timeSky(hour: number): { sky: string; night: boolean; label: string } {
  if (hour >= 5 && hour < 10) return { sky: "#fef3c7", night: false, label: "Buổi sáng" };
  if (hour >= 10 && hour < 16) return { sky: "#bae6fd", night: false, label: "Ban ngày" };
  if (hour >= 16 && hour < 19) return { sky: "#fbcfe8", night: false, label: "Hoàng hôn" };
  return { sky: "#3730a3", night: true, label: "Ban đêm" };
}

export const LOVE_ACTIONS: { kind: string; icon: string; name: string; label: string }[] = [
  { kind: "hug", icon: "people-outline", name: "Ôm", label: "gửi một cái ôm thật ấm áp" },
  { kind: "kiss", icon: "heart-circle-outline", name: "Hôn gió", label: "gửi một nụ hôn gió" },
  { kind: "flower", icon: "flower-outline", name: "Tặng hoa", label: "tặng một bó hoa thơm ngát" },
  { kind: "star", icon: "star-outline", name: "Thả sao", label: "thả một ngôi sao may mắn" },
];

/* ---------- Mini-game: Hiểu ý nhau ---------- */
export interface QuizQuestion { q: string; options: [string, string] }
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { q: "Buổi hẹn lý tưởng nhất là?", options: ["Ở nhà xem phim ôm nhau", "Ra ngoài khám phá chỗ mới"] },
  { q: "Món quà khiến bạn vui nhất?", options: ["Quà tự tay làm", "Quà mua đắt tiền"] },
  { q: "Khi buồn, bạn muốn đối phương...", options: ["Ôm và ở bên lặng lẽ", "Kể chuyện vui cho nghe"] },
  { q: "Kỳ nghỉ mơ ước?", options: ["Biển xanh cát trắng", "Núi rừng se lạnh"] },
  { q: "Tỏ tình kiểu nào lãng mạn hơn?", options: ["Bất ngờ trước đám đông", "Riêng tư chỉ hai người"] },
  { q: "Buổi sáng hoàn hảo bắt đầu bằng...", options: ["Tin nhắn chào buổi sáng", "Cà phê cùng nhau"] },
  { q: "Điều quan trọng nhất trong tình yêu?", options: ["Tin tưởng tuyệt đối", "Luôn tạo bất ngờ"] },
  { q: "Khi giận nhau, nên...", options: ["Nói chuyện ngay cho rõ", "Im lặng một lúc cho nguôi"] },
];
export function quizOfDay(date = new Date()): QuizQuestion[] {
  const dayNum = Math.floor(date.getTime() / 86400000);
  const out: QuizQuestion[] = [];
  for (let i = 0; i < 4; i++) out.push(QUIZ_QUESTIONS[(dayNum * 4 + i) % QUIZ_QUESTIONS.length]);
  return out;
}

/* ---------- Mini-game: Vòng quay yêu thương ---------- */
export type SpinKind = "coins" | "letter-common" | "letter-rare" | "mission" | "xp" | "again";
export interface SpinSegment { label: string; kind: SpinKind; amount: number; color: string }
export const SPIN_SEGMENTS: SpinSegment[] = [
  { label: "+20 Xu", kind: "coins", amount: 20, color: "#f9a8d4" },
  { label: "Thư thường", kind: "letter-common", amount: 0, color: "#bae6fd" },
  { label: "+10 XP", kind: "xp", amount: 10, color: "#a7f3d0" },
  { label: "Nhiệm vụ yêu", kind: "mission", amount: 0, color: "#fde68a" },
  { label: "+50 Xu", kind: "coins", amount: 50, color: "#f472b6" },
  { label: "Thư hiếm", kind: "letter-rare", amount: 0, color: "#ddd6fe" },
  { label: "+15 Xu", kind: "coins", amount: 15, color: "#fecdd3" },
  { label: "Thêm lượt", kind: "again", amount: 1, color: "#bbf7d0" },
];
export const SPIN_MISSIONS = [
  "Ôm đối phương thật chặt trong 10 giây",
  "Nói 3 điều bạn thích nhất ở đối phương",
  "Pha cho đối phương một ly nước/cà phê",
  "Nhắn một tin nhắn thật ngọt ngay bây giờ",
  "Cùng nhau tưới cây trong vườn ngay nhé",
  "Hát cho đối phương nghe một đoạn bài hát tủ",
];
export const MAX_DAILY_SPINS = 3;
