import { sendVerificationEmail, verifyLoginCode } from './auth';
import { registerSession } from './forms';
import { bookSlot, cancelReservation, joinReservation, leaveReservation } from './reservation';
import { deleteRoom, saveRoom } from './rooms';

export const server = {
	sendVerificationEmail,
	verifyLoginCode,

	saveRoom,
	deleteRoom,
	
	bookSlot,
	cancelReservation,
	joinReservation,
	leaveReservation,

	registerSession
};