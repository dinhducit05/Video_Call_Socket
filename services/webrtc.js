export const rtcConfig = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

export function createPeerConnection(socket, targetSocketId, localStream, onRemoteStream) {
    const peer = new RTCPeerConnection(rtcConfig);

    // Đưa audio/video của mình vào kết nối
    localStream.getTracks().forEach((track) => {
        peer.addTrack(track, localStream);
    });

    // Nhận video/audio từ người còn lại
    peer.ontrack = (event) => {
        onRemoteStream(event.streams[0]);
    };

    // Khi trình duyệt tìm ra thông tin mạng, gửi sang người còn lại
    peer.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", {
                targetSocketId,
                candidate: event.candidate
            });
        }
    };

    return peer;
}