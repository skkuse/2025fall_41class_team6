import { RecommendationResponse } from '../types';
import { MOCK_RESPONSE_YONGSAN } from '../mocks/data';
import {SimpleMessage} from "./recommendationApi";

export const getMockRecommendation = (
    query: string,
    history: SimpleMessage[]
): Promise<RecommendationResponse> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(MOCK_RESPONSE_YONGSAN);
        }, 1500);
    });
};