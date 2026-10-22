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
export const DATE_IDEAS = [
  "🧺 Picnic công viên + bánh tự làm",
  "🎨 Cùng nhau vẽ tranh chibi tặng nhau",
  "🍜 Food tour chợ đêm, mỗi người chọn 3 món",
  "🎬 Xem phim tại nhà + bắp rang + chăn ấm",
  "📸 Chụp photobooth và in ảnh dán tường",
  "🚲 Đạp xe quanh hồ lúc hoàng hôn",
  "🍰 Học làm bánh tại workshop",
  "🌌 Ngắm sao + kể chuyện tuổi thơ",
  "🛍️ Thử thách: mua quà cho nhau dưới 100k",
  "🎤 Karaoke song ca bài tủ của hai đứa",
  "🌻 Đi vườn hoa / nông trại hái dâu",
  "☕ Cafe sách, đọc cho nhau nghe một chương",
  "🏖️ Đi biển, xây lâu đài cát hình trái tim",
  "🎮 Chơi game co-op cùng nhau cả buổi",
  "✈️ Lên kế hoạch chuyến đi mơ ước trên giấy",
];
export const MOODS = ["😊","🥰","😍","😴","🥺","😤","🤒","🎉","😌","🥳","😢","🔥"];
export const NOTE_COLORS = ["bg-pink-100","bg-amber-100","bg-sky-100","bg-emerald-100","bg-violet-100","bg-rose-100"];
export function questionOfDay(date = new Date()) {
  const dayNum = Math.floor(date.getTime() / 86400000);
  return QUESTIONS[dayNum % QUESTIONS.length];
}

export interface LoveMessage { id: number; text: string; rarity: "common" | "rare" | "legendary"; }
export const LOVE_MESSAGES: LoveMessage[] = [
  // Thường (1-18)
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
  // Hiếm (19-28)
  { id: 19, text: "✨ SONG CHĂM: Khi hai trái tim cùng đập một nhịp, cả khu vườn bừng sáng. Hai đứa vừa tạo ra khoảnh khắc hiếm có đó!", rarity: "rare" },
  { id: 20, text: "✨ Người ta nói tình yêu đẹp nhất là khi cả hai cùng cố gắng — và hai đứa đang làm đúng như vậy.", rarity: "rare" },
  { id: 21, text: "✨ Mốc chăm sóc này chứng minh: yêu thương của hai đứa không phải cảm xúc nhất thời, mà là thói quen bền bỉ.", rarity: "rare" },
  { id: 22, text: "✨ Có những người đi qua đời nhau như gió, còn hai đứa chọn ở lại và cùng nhau bén rễ.", rarity: "rare" },
  { id: 23, text: "✨ Nếu tình yêu là một khu vườn, hai đứa là hai người làm vườn tận tâm nhất thế gian.", rarity: "rare" },
  { id: 24, text: "✨ Khoảnh khắc cả hai cùng chăm cây là minh chứng: khoảng cách nào cũng thua sự đồng lòng.", rarity: "rare" },
  { id: 25, text: "✨ Chúc mừng cột mốc mới! Mỗi lần chăm là một lời hứa thầm lặng: mình sẽ không bỏ cuộc.", rarity: "rare" },
  { id: 26, text: "✨ Tình yêu của hai đứa vừa lên một nấc thang mới — rực rỡ và đáng tự hào.", rarity: "rare" },
  { id: 27, text: "✨ Hai bàn tay cùng vun trồng thì không có mùa đông nào làm cây héo được.", rarity: "rare" },
  { id: 28, text: "✨ Thư hiếm này chỉ xuất hiện khi hai đứa thật sự đồng điệu. Giữ chặt nhau nhé!", rarity: "rare" },
  // Huyền thoại (29-36)
  { id: 29, text: "👑 HUYỀN THOẠI: Cây đã nở hoa! Tình yêu của hai đứa đã đi từ hạt mầm thành một khu vườn rực rỡ — đây là điều rất ít cặp đôi làm được.", rarity: "legendary" },
  { id: 30, text: "👑 HUYỀN THOẠI: Dưới tán cây trái tim này, hãy hứa với nhau: dù bão giông, mình vẫn cùng nhau che chở.", rarity: "legendary" },
  { id: 31, text: "👑 HUYỀN THOẠI: Em/Anh là định mệnh đẹp nhất. Cây trái tim này là chứng nhân cho một tình yêu phi thường.", rarity: "legendary" },
  { id: 32, text: "👑 HUYỀN THOẠI: Từ một hạt giống nhỏ, hai đứa đã trồng nên cả một bầu trời yêu thương. Tự hào về hai đứa lắm!", rarity: "legendary" },
  { id: 33, text: "👑 HUYỀN THOẠI: Người đời tìm kiếm phép màu, còn phép màu của hai đứa chính là nhau.", rarity: "legendary" },
  { id: 34, text: "👑 HUYỀN THOẠI: Nếu viết thành sách, câu chuyện của hai đứa sẽ là chương đẹp nhất — và cây này là trang bìa lấp lánh.", rarity: "legendary" },
  { id: 35, text: "👑 HUYỀN THOẠI: Yêu đến mức làm cây kết trái tim — cấp độ này chỉ dành cho những trái tim kiên định nhất.", rarity: "legendary" },
  { id: 36, text: "👑 HUYỀN THOẠI: Mãi mãi không phải là lời hứa suông, mà là từng ngày hai đứa đã, đang và sẽ chăm sóc nhau như hôm nay.", rarity: "legendary" },
];
export function pickMessage(rarity: "common" | "rare" | "legendary", ownedIds: number[]): LoveMessage {
  const pool = LOVE_MESSAGES.filter((m) => m.rarity === rarity);
  const fresh = pool.filter((m) => !ownedIds.includes(m.id));
  const src = fresh.length ? fresh : pool;
  return src[Math.floor(Math.random() * src.length)];
}
export const QUESTS = [
  { id: "water3", label: "Tưới nước 3 lần hôm nay", emoji: "💧", target: 3, key: "water" as const, rewardXp: 15 },
  { id: "love2", label: "Bón tim 2 lần hôm nay", emoji: "💖", target: 2, key: "love" as const, rewardXp: 15 },
  { id: "both", label: "Cả 2 người đều chăm cây hôm nay", emoji: "👩‍❤️‍👨", target: 2, key: "both" as const, rewardXp: 20 },
];
export const ACHIEVEMENTS = [
  { id: "first", emoji: "🌱", label: "Lần chăm đầu tiên" },
  { id: "combo", emoji: "✨", label: "Combo Song chăm đầu tiên" },
  { id: "care25", emoji: "🏅", label: "Chăm cây 25 lần" },
  { id: "bloom", emoji: "🌸", label: "Cây nở hoa" },
  { id: "hearttree", emoji: "💖", label: "Cây trái tim" },
  { id: "collector10", emoji: "💌", label: "Sưu tập 10 lá thư" },
  { id: "streak3", emoji: "🔥", label: "Streak 3 ngày chăm cây" },
  { id: "questall", emoji: "🏆", label: "Hoàn thành hết nhiệm vụ ngày" },
];
