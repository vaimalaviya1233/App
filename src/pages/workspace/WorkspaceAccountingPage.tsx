import React, {useEffect, useMemo, useState} from 'react';
import type {OnyxEntry} from 'react-native-onyx/lib/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import * as Link from '@userActions/Link';
import Button from '@components/Button';
import useThemeStyles from '@hooks/useThemeStyles';
import * as BankAccounts from '@userActions/BankAccounts';
import type {Policy} from '@src/types/onyx';
import type {WithPolicyAndFullscreenLoadingProps} from './withPolicyAndFullscreenLoading';
import withPolicyAndFullscreenLoading from './withPolicyAndFullscreenLoading';
import { getQuickBooksOnlineSetupLink } from '@libs/actions/Integrations/QuickBooksOnline';
import useLocalize from '@hooks/useLocalize';
import useEnvironment from '@hooks/useEnvironment';

type QBOResponse = {
    oauthToken: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        access_token: string;
        companyID: string;
        companyName: string;
        expires: number;
        realmId: string;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        refresh_token: string;
        scope: string;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        token_type: string;
    },
    responseCode: number;
};

type WorkspaceAccountingPageProps = WithPolicyAndFullscreenLoadingProps &
    WorkspaceAccountingPageOnyxProps & {
        /** Policy values needed in the component */
        policy: OnyxEntry<Policy>;
    };

function fetchData(skipVBBACal?: boolean) {
    if (skipVBBACal) {
        return;
    }

    BankAccounts.openWorkspaceView();
}

// Sample route
// https://dev.new.expensify.com:8082/workspace/ED2B31F545CCC013?qbo_response=%7B%22oauthToken%22%3A%7B%22access_token%22%3A%22WHqfg7C1fGcg1ZUJyUakCDXk%2BHw1GGyQrrSAXMyOag7oIS1upWvHsKjsk7wrGgBw5tD4rPJUXZTUcbptgKe%5C%2FXn%5C%2FhLfM99KpYsKZTzu7V%5C%2FJz%5C%2FjUupHOHUAIpg07qZLbOsui0TtYr6QY8tqqUKpEmW21Va38EfSh4eySiTijaSeEtjiD76yWdxKWPWc0vRORqknyyRYGYdYsWbJGgkr6wKxCH3liFdoHM666lrXa81qdnJ1vDB8UVQlf2Wcb923HuLXbhXBFKKZt%5C%2FJTXTC6pUhGtHgTjvxBPAiHBLUR%5C%2Fco7P3SQrV0wuMb4pM1NQePqhWYmg37gtSVio8Og6ye0Sk6hGByK%2Bg6I1iGdkSxG%5C%2F0SjX0FsqZX0hse6Gv1%2Bgz7tDVHnL5vazqyxWEaNwC2DrZ%2BoqnNXPGECID2sGCexHXQv6eL2QVJRI1YKYYH6UNimvILDNkyXkQUVS0lum73F5xCpCnJdFOH4Yvl2H9s8zYjxquHDElA0YFhoD7zszDacXEjDfqImIO%5C%2FUSmQ13alE2y1eeoeZMc86r21wtXsd6o9GCtOQ0IPPr6LBTxh4Z87qRnFXj6%5C%2F%2Bduore3wetatZiihQMjAXpbSVuevsKPK5LjV3ozxMoTpZ8uA%2BdOep8rRfnsOcVTltD5%5C%2FOzHjWkIY%5C%2F90c1x%2B4uNxuc4OhLZ59PyaWcMuMgorUsLwmdD0%2BcyhnkFFPt9jZELAA27%5C%2FwxY5b1t7i0fm7HqFcJK0SjpIIQVy97C63NsFrs%5C%2F2bU%2BOcO3LLD9AoBSiYcYSIBRvPtPJsBJ93q6V4ddcDGrIOdQpOZWkti7xd%2B7yIG%5C%2FqT7cf8DqFsGQlpQg5lhRRnatJa%2BLxPQ36dyXDI1Q3iAx5ynXfxRs8YfAsOJ1BIm%5C%2FOL5jixbeS6eemVZOT4nAyLkftVmviGHnkzyIazrHi2VAekJmL9UmXM26MhpYAEOglIXdEXjVY8bfpXZjP42ZMn9K7xZCf%2B3PVcD1%5C%2F%2BL0xpxEiA4puKXsgroMj2nia8dHDMkDOo8gxhdPEpgUMkTz%5C%2FIFq%5C%2FHD27zCWdO1t74ixI0RwBwD3tquigh4wU%3D%3BT7TWITZacuRtYCB0RL9O%5C%2FQ%3D%3D%3BWKSNgTZ27bqa7OM%2B1qTdZdRSPY4IxbUKc7fvfGa5YrfvXUC3uSbQaMl1J6MaYXGtbo8IeI1LiJR%5C%2FN%5C%2FI%2BvS%5C%2FAAw%3D%3D%22%2C%22refresh_token%22%3A%22O%5C%2Fby0XaqkcaKiuIaSeEuzHoi3G%5C%2FpLWuSzHCMeCgKWHRwo2G3jzX8EjB5fvEhb7jMtNaRjPE4nB9gXd5harGahQ%3D%3D%3BnhSjDjlrCpczH%2BZzczE6pg%3D%3D%3BX4z3M8gWLNc6fZHxNckmvCQrJlaAKlO%5C%2FFsuHhPZCrjQ7aIHRPslRgC1Fqy7CxVy04pkk6Jbf8aOOwkh6uezLpA%3D%3D%22%2C%22expires%22%3A1706575744%2C%22companyID%22%3A%221423559500%22%2C%22realmId%22%3A%221423559500%22%2C%22scope%22%3A%22Accounting%22%2C%22companyName%22%3A%22Expensify%22%2C%22token_type%22%3A%22bearer%22%7D%2C%22responseCode%22%3A200%7D

function WorkspaceAccountingPage({
    policy,
    route,
}: WorkspaceAccountingPageProps) {
    const {environmentURL} = useEnvironment();
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    
    const qboResponse = useMemo(() : QBOResponse | null => {
        if (!route?.params.qbo_response) {
            return null;
        }
        return JSON.parse(route.params.qbo_response) as QBOResponse;
    }, [route?.params.qbo_response]);
    console.log('qboResponse', qboResponse);
    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
            testID={WorkspaceAccountingPage.displayName}
        >
            <HeaderWithBackButton
                title={translate('workspace.common.accounting')}
                onBackButtonPress={() => {}}
            />
            {policy !== null && (
                <Button onPress={() => Link.openLink(getQuickBooksOnlineSetupLink(`https://dev.new.expensify.com:8082/workspace/${policy.id}/accounting`, policy.id), environmentURL, false)}>
                    <Text>Quickbooks Online</Text>
                </Button>
            )}
        </ScreenWrapper>
    );
}

WorkspaceAccountingPage.displayName = 'WorkspaceAccountingPage';

// export default withPolicyAndFullscreenLoading(
//     withOnyx<WorkspaceAccountingPageProps, WorkspaceAccountingPageOnyxProps>({
//         user: {
//             key: ONYXKEYS.USER,
//         },
//         reimbursementAccount: {
//             key: ONYXKEYS.REIMBURSEMENT_ACCOUNT,
//         },
//     })(WorkspaceAccountingPage),
// );
export default withPolicyAndFullscreenLoading(WorkspaceAccountingPage);
