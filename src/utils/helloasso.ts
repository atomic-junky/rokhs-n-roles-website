import { HELLOASSO_API_ENDPOINT, HELLOASSO_CLIENT_ID, HELLOASSO_CLIENT_SECRET, HELLOASSO_ORGANIZATION_SLUG } from 'astro:env/server';

const ACTIVE_ITEM_STATES = ['Processed', 'Registered'];
const EMAIL_FIELD_IDS = [8824939, 9822]

const accessTokenCache: { token: string | null; expiresAt: number | null } = {
    token: null,
    expiresAt: null,
};

type Pagination = {
    pageSize: number;
    totalCount: number;
    pageIndex: number;
    totalPages: number;
    continuationToken: string | null;
}

type CustomField = {
    id: number;
    name: string;
    type: string;
    answer: string;
}

type OrderItem = {
    type: string;
    state: string;
    customFields?: CustomField[];
    [key: string]: any 
};

type Order = {
    payer: { email: string, firstName: string, lastName: string };
    items: OrderItem[];
    [key: string]: any
};

const getHelloAssoAPIOptions = async () => {
    const bearerToken = await getHelloAssoBearerToken();
    return {
        method: 'GET',
        headers: {
            accept: 'application/json',
            authorization: 'Bearer ' + bearerToken
        },
    };
}

export const getHelloAssoBearerToken = async (): Promise<string> => {
    const endpoint = HELLOASSO_API_ENDPOINT;    
    const clientId = HELLOASSO_CLIENT_ID;
    const clientSecret = HELLOASSO_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('HelloAsso client ID or secret is not set in environment variables.');
    }

    if (accessTokenCache.token && accessTokenCache.expiresAt && Date.now() < accessTokenCache.expiresAt) {
        return accessTokenCache.token;
    }

    const body = new URLSearchParams();
    body.append('client_id', clientId);
    body.append('client_secret', clientSecret);

    if (accessTokenCache.token != null) {
        body.append('grant_type', 'refresh_token');
    } else {
        body.append('grant_type', 'client_credentials');
    }

    const response = await fetch(`${endpoint}oauth2/token`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
    });

    if (!response.ok) {
        throw new Error(`Failed to get HelloAsso bearer token: ${response.statusText}`);
    }

    const data = await response.json();
    accessTokenCache.token = data.access_token;
    accessTokenCache.expiresAt = Date.now() + data.expires_in * 1000;
    return data.access_token;
};

export async function getHelloAssoFormSlug(): Promise<string> {
    try {
        const url: string = `${HELLOASSO_API_ENDPOINT}v5/organizations/${HELLOASSO_ORGANIZATION_SLUG}/forms?states=Public&formTypes=Membership`;
        const options = await getHelloAssoAPIOptions();

        const response = await fetch(url, options)
        if (!response.ok) {
            throw new Error(`Failed to fetch HelloAsso forms: ${response.statusText}`);
        }
        
        const res = await response.json();

        const forms = res.data;
        if (!forms || forms.length === 0) {
            throw new Error('No forms found for the organization.');
        }

        if (forms.length > 1) {
            console.warn('Multiple forms found for the organization. Using the first one.');
        }

        return forms[0].formSlug;
    } catch (error) {
        console.error('Error fetching HelloAsso form slug:', error);
        throw error;
    }
}

const getOrderPage = async (page: number, continuationToken: string | null): Promise<{ orders: Array<{ [key: string ]: any }>, pagination: Pagination }> => {
    const emptyResult = { orders: [], pagination: { pageSize: 0, totalCount: 0, pageIndex: 0, totalPages: 0, continuationToken: null } };

    try {
        const formType = 'Membership';
        const formSlug = await getHelloAssoFormSlug();
        if (formSlug == undefined) {
            console.error('Form slug not found');
            return emptyResult;
        }
        const url: string = `${HELLOASSO_API_ENDPOINT}v5/organizations/${HELLOASSO_ORGANIZATION_SLUG}/forms/${formType}/${encodeURIComponent(formSlug)}/orders?withDetails=true&page=${page}${continuationToken ? `&continuationToken=${encodeURIComponent(continuationToken)}` : ''}`;
        const options = await getHelloAssoAPIOptions();

        const response = await fetch(url, options)
        if (!response.ok) {
            console.error(`Failed to fetch HelloAsso payments: ${response.statusText}`);
            return emptyResult;
        }

        const res = await response.json();
        const orders = res.data;
        const pagination: Pagination = res.pagination;
        return { orders, pagination };
    } catch (error) {
        console.error('Error fetching HelloAsso orders:', error);
        return emptyResult;
    }
}

export const getOrders = async () : Promise<Array<Order>> => {
    const orders: Array<Order> = [];
    let page = 0;
    let continuationToken: string | null = null;

    const firstPage = await getOrderPage(page, continuationToken);
    const maxPage = firstPage.pagination.totalPages;
    continuationToken = firstPage.pagination.continuationToken;
    page = firstPage.pagination.pageIndex + 1;
    orders.push(...firstPage.orders as Array<Order>);

    while (page < maxPage) {
        const { orders: pageOrders, pagination } = await getOrderPage(page, continuationToken);
        orders.push(...pageOrders as Array<Order>);
        continuationToken = pagination.continuationToken;
        page = pagination.pageIndex + 1;
    }

    return orders;
}       

export const getHelloAssoMemberships = async (email: string): Promise<OrderItem[]> => {
	if (!email) return [];
 
	const orders = await getOrders();
	return orders.flatMap((order) => {
		const payerEmail = order.payer.email.toLocaleLowerCase();
		return (order.items ?? []).filter((item: OrderItem) => {
			if (item.type !== 'Membership') return false;
			if (!ACTIVE_ITEM_STATES.includes(item.state)) return false;
 
			const memberEmails = (item.customFields ?? [])
				.filter((field) => EMAIL_FIELD_IDS.includes(field.id))
				.map((field) => field.answer.toLowerCase());
			return memberEmails.includes(email) || payerEmail === email;
		});
	});
};

export const getHelloAssoOrganizationDetails = async (email: string): Promise<{ [key: string ]: any } | null> => {
    try {
        const url: string = `${HELLOASSO_API_ENDPOINT}v5/organizations/${HELLOASSO_ORGANIZATION_SLUG}`;
        const options = await getHelloAssoAPIOptions();

        const response = await fetch(url, options)
        if (!response.ok) {
            console.error(`Failed to fetch HelloAsso organization: ${response.statusText}`);
            return null;
        }

        return response.json();
    } catch (error) {
        console.error('Error checking HelloAsso organization admin:', error);
        return null;
    }
}